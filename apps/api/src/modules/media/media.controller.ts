import { Body, Controller, Delete, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { MediaService } from './media.service';
import { RequestUploadUrlDto } from './dto/request-upload-url.dto';
import { ConfirmProductImageDto } from './dto/confirm-product-image.dto';
import { KeycloakAuthGuard } from '../../common/guards/keycloak-auth.guard';
import { Scopes } from '../../common/decorators/scopes.decorator';

// Admin-only throughout — reuses 'products:write' rather than introducing
// a new scope, since managing a product's images is a sub-capability of
// managing the product, not a separately grantable permission. Revisit
// this if categories/bundles get image support later and the same scope
// stops making sense for all of them.
@UseGuards(KeycloakAuthGuard)
@Scopes('products:write')
@Controller({ path: 'media', version: '1' })
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('product-images/upload-url')
  requestUploadUrl(@Body() dto: RequestUploadUrlDto) {
    return this.mediaService.requestProductImageUploadUrl(dto);
  }

  @Post('product-images')
  confirm(@Body() dto: ConfirmProductImageDto) {
    return this.mediaService.confirmProductImage(dto);
  }

  @Delete('product-images/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.removeProductImage(id);
  }
}
