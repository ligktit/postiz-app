import { IsString, IsOptional, MaxLength, ValidateIf } from 'class-validator';

export class ZaloDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
