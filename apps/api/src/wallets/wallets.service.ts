import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TxType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KamekazService } from '../kamekaz/kamekaz.service';
import { CreateWalletDto, PayoutDto, TopupDto } from './dto/wallet.dto';

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kamekaz: KamekazService,
  ) {}

  async create(dto: CreateWalletDto) {
    const existing = await this.prisma.wallet.findUnique({
      where: { userId: dto.userId },
    });
    if (existing) {
      throw new ConflictException(`Wallet already exists for userId ${dto.userId}`);
    }

    // Never trust the client - always verify against kamekaz-auth first
    await this.kamekaz.verifyUserApproved(dto.userId);

    const wallet = await this.prisma.wallet.create({
      data: { userId: dto.userId },
    });

    this.logger.log(`Wallet created for userId=${dto.userId}`);
    return wallet;
  }

  async getByUserId(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException(`Wallet not found for userId ${userId}`);
    }
    return { userId: wallet.userId, balance: wallet.balance, currency: wallet.currency };
  }

  async topup(dto: TopupDto, adminEmail: string) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: dto.userId } });
      if (!wallet) {
        throw new NotFoundException(`Wallet not found for userId ${dto.userId}`);
      }

      const updated = await tx.wallet.update({
        where: { userId: dto.userId },
        data: { balance: { increment: new Prisma.Decimal(dto.amount) } },
      });

      const transaction = await tx.transaction.create({
        data: {
          referenceId: `TOPUP-${wallet.userId}-${Date.now()}`,
          fromUserId: 'SYSTEM',
          toUserId: dto.userId,
          amount: new Prisma.Decimal(dto.amount),
          type: TxType.TOPUP,
          appSource: 'sdeed-pay',
          description: dto.description,
        },
      });

      this.logger.log(
        `[ADMIN ACTION] ${adminEmail} topped up ${dto.amount} LBP to userId=${dto.userId}`,
      );

      return { wallet: updated, transaction };
    });
  }

  async payout(dto: PayoutDto, adminEmail: string) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: dto.userId } });
      if (!wallet) {
        throw new NotFoundException(`Wallet not found for userId ${dto.userId}`);
      }

      if (wallet.balance.lessThan(dto.amount)) {
        throw new BadRequestException('Insufficient balance for payout');
      }

      const updated = await tx.wallet.update({
        where: { userId: dto.userId },
        data: { balance: { decrement: new Prisma.Decimal(dto.amount) } },
      });

      const transaction = await tx.transaction.create({
        data: {
          referenceId: `PAYOUT-${wallet.userId}-${Date.now()}`,
          fromUserId: dto.userId,
          toUserId: 'SYSTEM',
          amount: new Prisma.Decimal(dto.amount),
          type: TxType.PAYOUT,
          appSource: 'sdeed-pay',
          description: dto.description,
        },
      });

      this.logger.log(
        `[ADMIN ACTION] ${adminEmail} paid out ${dto.amount} LBP from userId=${dto.userId}`,
      );

      return { wallet: updated, transaction };
    });
  }

  async findAll() {
    return this.prisma.wallet.findMany({ orderBy: { createdAt: 'desc' } });
  }
}
