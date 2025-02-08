import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DeckDto } from './deck.dto';

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

  @IsString()
  project_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeckDto)
  deck: DeckDto[];
}
