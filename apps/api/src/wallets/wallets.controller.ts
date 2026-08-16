import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { CreateWalletDto, PayoutDto, TopupDto } from './dto/wallet.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CurrentAdmin } from '../common/decorators/current-admin.decorator';

@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  // Called by kamekaz-auth when an admin approves a new user.
  @UseGuards(ApiKeyGuard)
  @Post('create')
  create(@Body() dto: CreateWalletDto) {
    return this.walletsService.create(dto);
  }

  // Admin panel: list all wallets
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.walletsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':userId')
  getByUserId(@Param('userId') userId: string) {
    return this.walletsService.getByUserId(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('topup')
  topup(@Body() dto: TopupDto, @CurrentAdmin() admin: { email: string }) {
    return this.walletsService.topup(dto, admin.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('payout')
  payout(@Body() dto: PayoutDto, @CurrentAdmin() admin: { email: string }) {
    return this.walletsService.payout(dto, admin.email);
  }
}
