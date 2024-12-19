import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { UserSession } from './user.session.entity';
import { SessionDeck } from './session.deck.entity';
import { Story } from './story.entity';
import { SessionStatus } from 'src/commons/enums/poker.enums';

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

  @Column({ nullable: true })
  team_name: string;

  @Column({
    type: 'text',
    nullable: true,
    unique: true,
  })
  session_code?: string;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.WAITING,
  })
  status: SessionStatus;

  @OneToMany(() => UserSession, (userSession) => userSession.session)
  user_sessions: UserSession[];

  @OneToMany(() => SessionDeck, (sessionDeck) => sessionDeck.session)
  session_decks: SessionDeck[];

  @OneToMany(() => Story, (story) => story.session)
  stories: Story[];
}
