import { IsString } from 'class-validator';

export class ValidateSession {
  @IsString()
  user_id: string;
}
