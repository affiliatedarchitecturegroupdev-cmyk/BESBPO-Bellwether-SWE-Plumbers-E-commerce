import { Body, Controller, Post } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { SubscribeDto } from './dto/subscribe.dto';

// Both public, no auth — a newsletter is meant to capture interest from
// any visitor, not just registered customers, and unsubscribing
// (typically clicked from an email link) can't assume a signed-in
// session either.
@Controller({ path: 'newsletter', version: '1' })
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  subscribe(@Body() dto: SubscribeDto) {
    return this.newsletterService.subscribe(dto.email);
  }

  @Post('unsubscribe')
  unsubscribe(@Body() dto: SubscribeDto) {
    return this.newsletterService.unsubscribe(dto.email);
  }
}
