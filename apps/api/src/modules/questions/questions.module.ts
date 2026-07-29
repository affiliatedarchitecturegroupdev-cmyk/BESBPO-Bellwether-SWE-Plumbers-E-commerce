import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [AccountsModule],
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule {}
