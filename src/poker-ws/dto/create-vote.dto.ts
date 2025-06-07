import { IsString, IsNotEmpty } from 'class-validator';

export class CreateVoteDto {
  @IsString()
  @IsNotEmpty()
  story_id: string;

  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  card_value: string;
}
