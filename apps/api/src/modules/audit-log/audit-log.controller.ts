import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { Scopes } from '../../common/decorators/scopes.decorator';

// Reuses 'orders:manage', same reasoning as AnalyticsController — this
// isn't a dedicated permission, it's read access to an operational log
// that any trusted admin should be able to review.
@UseGuards(KeycloakAuthGuard)
@Scopes('orders:manage')
@Controller({ path: 'audit-log', version: '1' })
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  findRecent(@Query() query: QueryAuditLogDto) {
    return this.auditLogService.findRecent(query.limit);
  }
}
