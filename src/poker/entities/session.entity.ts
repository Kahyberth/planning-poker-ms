import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';

import { SessionStatus, VotingScale } from 'src/commons/enums/poker.enums';
import { Join_Session } from './join.session.entity';
import { Vote } from './vote.entity';
import { Chat } from './chat.entity';

@Entity()
export class Session {
  @PrimaryGeneratedColumn('uuid')
  session_id: string;

  @Column('text', {
    unique: true,
  })
  session_name: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column('text')
  created_by: string;

  @Column('text', {
    nullable: true,
  })
  description?: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({
    type: 'text',
    nullable: true,
    unique: true,
  })
  session_code?: string;

  @Column({
    type: 'enum',
    enum: VotingScale,
    default: VotingScale.FIBONACCI,
    nullable: true,
  })
  voting_scale?: string;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.WAITING,
  })
  status: SessionStatus;

  @OneToMany(() => Join_Session, (join_session) => join_session.session)
  join_session: Join_Session[];

  @OneToMany(() => Vote, (vote) => vote.session)
  vote: Vote[];

  @OneToOne(() => Chat)
  @JoinColumn()
  chat: Chat;
}
