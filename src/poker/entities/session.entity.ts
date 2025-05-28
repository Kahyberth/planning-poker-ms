import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { SessionStatus, VotingScale } from '../../commons/enums/poker.enums';
import { Chat } from './chat.entity';
import { Decks } from './decks.entity';
import { History } from './history.entity';
import { Join_Session } from './join.session.entity';
import { Vote } from './vote.entity';

@Entity()
@Index('IDX_ACTIVE_SESSION_NAME', ['session_name'], {
  unique: true,
  where: `"is_active" = true`,
})
export class Session {
  @PrimaryGeneratedColumn('uuid')
  session_id: string;

  @Column('text')
  session_name: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column('text')
  created_by: string;

  @Column('text', {
    nullable: false,
  })
  leader_id?: string;

  @Column('text', {
    nullable: true,
  })
  description?: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  is_started: boolean;

  @Column({
    type: 'text',
    nullable: true,
  })
  session_code?: string;

  @Column({
    type: 'text',
  })
  project_id: string;

  @Column()
  project_name: string;

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

  @Column({
    type: 'int',
    default: 8,
  })
  capacity: number;

  @OneToMany(() => Join_Session, (join_session) => join_session.session)
  join_session: Join_Session[];

  @OneToMany(() => Vote, (vote) => vote.session)
  vote: Vote[];

  @OneToMany(() => Chat, (chat) => chat.session, { cascade: true })
  chats: Chat[];

  @OneToMany(() => History, (history) => history.session)
  histories: History[];

  @OneToOne(() => Decks, (decks) => decks.session, { cascade: true })
  @JoinColumn()
  decks: Decks;
}
