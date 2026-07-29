import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { Scopes } from '../../common/decorators/scopes.decorator';

@Controller({ path: 'categories', version: '1' })
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findTree() {
    return this.categoriesService.findTree();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.categoriesService.findOneBySlug(slug);
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('categories:write')
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('categories:write')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @UseGuards(KeycloakAuthGuard)
  @Scopes('categories:write')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.remove(id);
  }
}
