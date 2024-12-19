import { SessionStatus } from '../enums/poker.enums';

export interface getSessions {
  id: string;
  name: string;
  members: number;
  status: SessionStatus;
  isPrivate: boolean;
}

export interface joinSession {
  session_id: string;
  user_id: string;
}
