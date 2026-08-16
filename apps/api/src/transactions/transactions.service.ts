import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, TxType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionQueryDto, TransferDto } from './dto/transaction.dto';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Transfers funds between two wallets. Idempotent on `referenceId`:
   * if the same referenceId is replayed (e.g. fleet.os retries a
   * failed request), the original transaction is returned unchanged
   * instead of moving money twice.
   */
  async transfer(dto: TransferDto) {
    const existing = await this.prisma.transaction.findUnique({
      where: { referenceId: dto.referenceId },
    });
    if (existing) {
      this.logger.warn(`Idempotent replay detected for referenceId=${dto.referenceId}`);
      return existing;
    }

    return this.prisma.$transaction(async (tx) => {
      const fromWallet = await tx.wallet.findUnique({ where: { userId: dto.fromUserId } });
      if (!fromWallet) {
        throw new NotFoundException(`Wallet not found for fromUserId ${dto.fromUserId}`);
      }

      const toWallet = await tx.wallet.findUnique({ where: { userId: dto.toUserId } });
      if (!toWallet) {
        throw new NotFoundException(`Wallet not found for toUserId ${dto.toUserId}`);
      }

      if (fromWallet.balance.lessThan(dto.amount)) {
        throw new BadRequestException('Insufficient balance for transfer');
      }

      await tx.wallet.update({
        where: { userId: dto.fromUserId },
        data: { balance: { decrement: new Prisma.Decimal(dto.amount) } },
      });

      await tx.wallet.update({
        where: { userId: dto.toUserId },
        data: { balance: { increment: new Prisma.Decimal(dto.amount) } },
      });

      const transaction = await tx.transaction.create({
        data: {
          referenceId: dto.referenceId,
          fromUserId: dto.fromUserId,
          toUserId: dto.toUserId,
          amount: new Prisma.Decimal(dto.amount),
          type: dto.type ?? TxType.ORDER_PAYMENT,
          appSource: dto.appSource,
          description: dto.description,
        },
      });

      this.logger.log(
        `Transfer ${dto.amount} LBP ${dto.fromUserId} -> ${dto.toUserId} (${dto.appSource}, ref=${dto.referenceId})`,
      );

      return transaction;
    });
  }

  async findAll(query: TransactionQueryDto) {
    const where: Prisma.TransactionWhereInput = {};

    if (query.userId) {
      where.OR = [{ fromUserId: query.userId }, { toUserId: query.userId }];
    }
    if (query.appSource) {
      where.appSource = query.appSource;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
      if (query.toDate) where.createdAt.lte = new Date(query.toDate);
    }

    return this.prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}
