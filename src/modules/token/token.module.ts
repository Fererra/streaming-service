import { Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule, JwtModule.register({ global: true })],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
