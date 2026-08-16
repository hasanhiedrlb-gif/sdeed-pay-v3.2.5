import { Controller, Get, Param } from '@nestjs/common';
import { IntegrationService } from './integration.service';

// Public endpoints consumed directly by other platform services (fleet.os).
@Controller('integration')
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Get('balance/:userId')
  getBalance(@Param('userId') userId: string) {
    return this.integrationService.getBalance(userId);
  }
}
