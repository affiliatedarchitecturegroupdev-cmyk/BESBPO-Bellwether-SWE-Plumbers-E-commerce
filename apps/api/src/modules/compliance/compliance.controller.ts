import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { IssueCoCRecordDto } from './dto/issue-coc-record.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { Scopes } from '../../common/decorators/scopes.decorator';
import { CurrentAccount, AuthenticatedAccount } from '../../common/decorators/current-account.decorator';

@UseGuards(KeycloakAuthGuard)
@Controller({ path: 'compliance/coc', version: '1' })
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Scopes('compliance:manage')
  @Post()
  issue(@CurrentAccount() current: AuthenticatedAccount, @Body() dto: IssueCoCRecordDto) {
    return this.complianceService.issue(dto, current.email);
  }

  @Get()
  findMine(@CurrentAccount() current: AuthenticatedAccount) {
    return this.complianceService.findMine(current.keycloakSub, current.email);
  }

  @Get(':id')
  findOne(@CurrentAccount() current: AuthenticatedAccount, @Param('id', ParseUUIDPipe) id: string) {
    return this.complianceService.findOneForAccount(current.keycloakSub, current.email, id);
  }
}
