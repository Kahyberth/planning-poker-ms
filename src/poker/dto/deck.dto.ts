import { IsString } from 'class-validator';

export class DeckDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  priority: string;
}
