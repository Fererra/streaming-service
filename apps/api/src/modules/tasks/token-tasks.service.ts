import { Injectable } from '@nestjs/common';
import { TokenService } from '../token/token.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TokenTasksService {
  constructor(private readonly tokenService: TokenService) {}

  @Cron('0 3 * * *', {
    name: 'dailyTokenCleanup',
    timeZone: 'Europe/Kyiv',
  })
  async handleDailyTokenCleanup() {
    await this.tokenService.removeExpiredTokens();
  }
}
