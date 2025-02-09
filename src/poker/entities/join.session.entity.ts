import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Session } from './session.entity';

@Entity()
export class Join_Session {
  @PrimaryGeneratedColumn('uuid')
  join_session_id: string;

  @Column('text')
  user_id: string;

  @CreateDateColumn({ type: 'timestamp' })
  joined_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  left_at: Date;

  @ManyToOne(() => Session, (session) => session.join_session, {
    cascade: true,
  })
  @JoinColumn()
  session: Session;
}
