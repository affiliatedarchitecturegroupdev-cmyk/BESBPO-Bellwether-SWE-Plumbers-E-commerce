import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateBundleDto } from './create-bundle.dto';

// Deliberately excludes `items` — replacing a bundle's composition is a
// different, transactional operation from editing its name/price/sector.
// If that's needed, it should be its own endpoint
// (e.g. PUT /bundles/:id/items) rather than overloading this one.
export class UpdateBundleDto extends PartialType(OmitType(CreateBundleDto, ['items'] as const)) {}
