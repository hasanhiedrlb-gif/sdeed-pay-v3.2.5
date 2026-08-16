import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KamekazService } from './kamekaz.service';

@Module({
  imports: [HttpModule.register({ timeout: 5000 })],
  providers: [KamekazService],
  exports: [KamekazService],
})
export class KamekazModule {}
