import { IsOptional, IsString } from 'class-validator';

export class CreatePokerDto {
  @IsString()
  session_name: string;
  @IsString()
  created_by: string;
  @IsString()
  @IsOptional()
  session_code?: string;
  @IsString()
  @IsOptional()
  description?: string;
  @IsString()
  @IsOptional()
  voting_scale?: string;
}
