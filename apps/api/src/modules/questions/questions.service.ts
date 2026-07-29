import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductAnswer, ProductQuestion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { QueryQuestionsDto } from './dto/query-questions.dto';

const QUESTION_INCLUDE = {
  answers: { orderBy: { createdAt: 'asc' as const } },
};

export interface PaginatedQuestions {
  items: (ProductQuestion & { answers: ProductAnswer[] })[];
  page: number;
  pageSize: number;
  total: number;
}

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
  ) {}

  async findByProduct(query: QueryQuestionsDto): Promise<PaginatedQuestions> {
    const { productId, page, pageSize } = query;
    const skip = (page - 1) * pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.productQuestion.findMany({
        where: { productId },
        include: QUESTION_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.productQuestion.count({ where: { productId } }),
    ]);

    return { items, page, pageSize, total };
  }

  // No verified-purchase check, unlike ReviewsService.create — see
  // ProductQuestion's own schema comment for why that would be
  // backwards here.
  async ask(keycloakSub: string, email: string, dto: CreateQuestionDto): Promise<ProductQuestion> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);

    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException(`Product '${dto.productId}' not found`);
    }

    return this.prisma.productQuestion.create({
      data: { productId: dto.productId, accountId: account.id, question: dto.question },
    });
  }

  // Answerable by any authenticated account — see ProductAnswer's own
  // schema comment on why this isn't staff-only. isFromStaff is derived
  // from the CALLER'S OWN JWT scopes here, in the service, never a
  // client-supplied field — a customer has no way to submit an answer
  // that falsely claims staff authority. A plain customer account's JWT
  // carries no scopes at all in this system; any non-empty scopes array
  // means an admin/staff login, whichever specific scopes they happen to
  // hold — a broader, more robust check than testing for one particular
  // scope like products:write, which not every staff role is guaranteed
  // to carry.
  async answer(
    keycloakSub: string,
    email: string,
    scopes: string[],
    questionId: string,
    dto: CreateAnswerDto,
  ): Promise<ProductAnswer> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);

    const question = await this.prisma.productQuestion.findUnique({ where: { id: questionId } });
    if (!question) {
      throw new NotFoundException(`Question '${questionId}' not found`);
    }

    return this.prisma.productAnswer.create({
      data: {
        questionId,
        accountId: account.id,
        answer: dto.answer,
        isFromStaff: scopes.length > 0,
      },
    });
  }
}
