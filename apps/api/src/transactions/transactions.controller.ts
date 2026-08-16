import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionQueryDto, TransferDto } from './dto/transaction.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // Called by fleet.os (and internally by sdeed) when a user pays for an order.
  @UseGuards(ApiKeyGuard)
  @Post('transfer')
  transfer(@Body() dto: TransferDto) {
    return this.transactionsService.transfer(dto);
  }

  // Admin ledger, filterable
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query() query: TransactionQueryDto) {
    return this.transactionsService.findAll(query);
  }
}
