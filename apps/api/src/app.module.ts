import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WalletsModule } from './wallets/wallets.module';
import { TransactionsModule } from './transactions/transactions.module';
import { IntegrationModule } from './integration/integration.module';
import { KamekazModule } from './kamekaz/kamekaz.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    KamekazModule,
    AuthModule,
    WalletsModule,
    TransactionsModule,
    IntegrationModule,
  ],
})
export class AppModule {}
