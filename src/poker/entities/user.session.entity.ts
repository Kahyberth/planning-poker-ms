import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Session } from './session.entity';

export enum SessionRole {
  FACILITATOR = 'facilitator',
  MEMBER = 'member',
}

@Entity()
export class UserSession {
  @PrimaryColumn()
  user_id: string;

  @PrimaryColumn()
  session_id: string;

  @Column({
    type: 'enum',
    enum: SessionRole,
    default: SessionRole.MEMBER,
  })
  session_role: SessionRole;

  @CreateDateColumn({ type: 'timestamp' })
  joined_at: Date;

  @ManyToOne(() => Session, (session) => session.user_sessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: Session;
}
