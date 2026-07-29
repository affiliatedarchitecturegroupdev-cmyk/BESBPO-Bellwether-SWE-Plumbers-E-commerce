import { IsEmail, IsString, MinLength } from 'class-validator';

export class TrackOrderDto {
  @IsString()
  @MinLength(1)
  orderNumber!: string;

  @IsEmail()
  email!: string;
}
