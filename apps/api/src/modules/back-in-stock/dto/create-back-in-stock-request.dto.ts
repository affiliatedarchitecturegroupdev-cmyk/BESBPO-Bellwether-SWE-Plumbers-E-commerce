import { IsEmail, IsUUID } from 'class-validator';

export class CreateBackInStockRequestDto {
  @IsUUID()
  productId!: string;

  @IsEmail()
  email!: string;
}
