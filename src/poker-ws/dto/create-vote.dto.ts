import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateVoteDto {
  @IsNumber()
  @IsNotEmpty()
  story_id: number;

  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  card_value: string;
}
