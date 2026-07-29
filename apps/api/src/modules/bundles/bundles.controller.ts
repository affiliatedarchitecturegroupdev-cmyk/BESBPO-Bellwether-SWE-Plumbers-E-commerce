import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { BundlesService } from './bundles.service';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { UpdateBundleDto } from './dto/update-bundle.dto';
import { QueryBundlesDto } from './dto/query-bundles.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { Scopes } from '../../common/decorators/scopes.decorator';

@Controller({ path: 'bundles', version: '1' })
export class BundlesController {
  constructor(private readonly bundlesService: BundlesService) {}

  @Get()
  findAll(@Query() query: QueryBundlesDto) {
    return this.bundlesService.findAll(query);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.bundlesService.findOneBySlug(slug);
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('bundles:write')
  @Post()
  create(@Body() dto: CreateBundleDto) {
    return this.bundlesService.create(dto);
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('bundles:write')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBundleDto) {
    return this.bundlesService.update(id, dto);
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('bundles:write')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.bundlesService.remove(id);
  }
}
