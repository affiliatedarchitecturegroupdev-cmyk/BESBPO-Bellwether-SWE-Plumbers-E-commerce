import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { QueryQuestionsDto } from './dto/query-questions.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { CurrentAccount, AuthenticatedAccount } from '../../common/decorators/current-account.decorator';

@Controller({ path: 'questions', version: '1' })
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  // Public — anyone browsing a product can read its Q&A, same as
  // ReviewsController's own findByProduct.
  @Get()
  findByProduct(@Query() query: QueryQuestionsDto) {
    return this.questionsService.findByProduct(query);
  }

  @UseGuards(KeycloakAuthGuard)
  @Post()
  ask(@CurrentAccount() current: AuthenticatedAccount, @Body() dto: CreateQuestionDto) {
    return this.questionsService.ask(current.keycloakSub, current.email, dto);
  }

  @UseGuards(KeycloakAuthGuard)
  @Post(':id/answers')
  answer(
    @CurrentAccount() current: AuthenticatedAccount,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAnswerDto,
  ) {
    return this.questionsService.answer(current.keycloakSub, current.email, current.scopes, id, dto);
  }
}
