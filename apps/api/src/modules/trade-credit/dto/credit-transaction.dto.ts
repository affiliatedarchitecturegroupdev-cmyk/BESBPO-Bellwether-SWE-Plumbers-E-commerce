import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RecordDrawdownDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  // An order number, invoice number, or other reference a human reviewing
  // the account later can trace back to what this drawdown was for —
  // optional because not every drawdown will originate from this
  // codebase's own Order records (e.g. an offline invoice).
  @IsOptional()
  @IsString()
  reference?: string;
}

export class RecordRepaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  reference?: string;
}
