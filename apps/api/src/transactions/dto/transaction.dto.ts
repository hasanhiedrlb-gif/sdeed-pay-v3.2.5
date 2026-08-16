import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { TxType } from '@prisma/client';

export class TransferDto {
  @IsString()
  @IsNotEmpty()
  fromUserId: string;

  @IsString()
  @IsNotEmpty()
  toUserId: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  appSource: string; // "fleet.os" or "sdeed"

  @IsString()
  @IsNotEmpty()
  referenceId: string; // idempotency key

  @IsOptional()
  @IsEnum(TxType)
  type?: TxType; // defaults to ORDER_PAYMENT

  @IsOptional()
  @IsString()
  description?: string;
}

export class TransactionQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  appSource?: string;

  @IsOptional()
  @IsEnum(TxType)
  type?: TxType;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
