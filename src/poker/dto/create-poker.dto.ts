import { IsOptional, IsString } from 'class-validator';

export class CreatePokerDto {
  @IsString()
  name: string;
  @IsString()
  created_by: string;
  @IsString()
  @IsOptional()
  code?: string;
}
