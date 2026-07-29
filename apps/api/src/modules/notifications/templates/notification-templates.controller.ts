import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { NotificationTemplatesService } from './notification-templates.service';
import { UpsertNotificationTemplateDto } from './dto/upsert-notification-template.dto';
import { KeycloakAuthGuard } from '../../../common/guards/keycloak-auth.guard';
import { Scopes } from '../../../common/decorators/scopes.decorator';

// Route params like :type can legitimately contain dots (e.g.
// 'order.confirmed', 'compliance.coc-issued') — Express/Nest route
// matching splits only on '/', not '.', so this resolves correctly
// without any special encoding needed on the client side.
@UseGuards(KeycloakAuthGuard)
@Scopes('products:write')
@Controller({ path: 'notification-templates', version: '1' })
export class NotificationTemplatesController {
  constructor(private readonly notificationTemplatesService: NotificationTemplatesService) {}

  @Get()
  findAll() {
    return this.notificationTemplatesService.findAll();
  }

  @Post()
  upsert(@Body() dto: UpsertNotificationTemplateDto) {
    return this.notificationTemplatesService.upsert(dto);
  }

  @Delete(':type')
  resetToDefault(@Param('type') type: string) {
    return this.notificationTemplatesService.resetToDefault(type);
  }
}
