import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

/**
 * sdeed-pay NEVER trusts a userId coming from a client request body.
 * Before creating a wallet, we always verify the user exists and is
 * APPROVED in kamekaz-auth, the single source of truth for identity.
 */
@Injectable()
export class KamekazService {
  private readonly logger = new Logger(KamekazService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('KAMEKAZ_BASE_URL', 'https://kamekaz.com');
  }

  async verifyUserApproved(userId: string): Promise<void> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.baseUrl}/user/${userId}`),
      );

      if (!data) {
        throw new BadRequestException(`User ${userId} not found in kamekaz-auth`);
      }

      if (data.status !== 'APPROVED') {
        throw new BadRequestException(
          `User ${userId} is not APPROVED in kamekaz-auth (status=${data.status})`,
        );
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;

      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 404) {
        throw new BadRequestException(`User ${userId} does not exist in kamekaz-auth`);
      }

      this.logger.error(`Failed to reach kamekaz-auth for user ${userId}: ${axiosErr.message}`);
      throw new ServiceUnavailableException('Unable to verify user with kamekaz-auth');
    }
  }
}
