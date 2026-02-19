import { Module } from '@nestjs/common';
import { TokenTasksService } from './token-tasks.service';
import { TokenModule } from '../token/token.module';

@Module({
  imports: [TokenModule],
  providers: [TokenTasksService],
})
export class TasksModule {}
