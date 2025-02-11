import { IsString } from 'class-validator';

export class ValidateSession {
  @IsString()
  session_id: string;

  @IsString()
  user_id: string;
}
