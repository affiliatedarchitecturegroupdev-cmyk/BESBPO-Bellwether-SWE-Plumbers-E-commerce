import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { CurrentAccount, AuthenticatedAccount } from '../../common/decorators/current-account.decorator';

@Controller({ path: 'reviews', version: '1' })
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // Public — anyone browsing a product can read its reviews.
  @Get()
  findByProduct(@Query() query: QueryReviewsDto) {
    return this.reviewsService.findByProduct(query);
  }

  // Protected — writing a review needs a verified purchase, checked
  // inside ReviewsService.create, not just a valid session.
  @UseGuards(KeycloakAuthGuard)
  @Post()
  create(@CurrentAccount() current: AuthenticatedAccount, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(current.keycloakSub, current.email, dto);
  }

  @UseGuards(KeycloakAuthGuard)
  @Delete(':id')
  remove(@CurrentAccount() current: AuthenticatedAccount, @Param('id', ParseUUIDPipe) id: string) {
    return this.reviewsService.remove(current.keycloakSub, current.email, id);
  }
}
