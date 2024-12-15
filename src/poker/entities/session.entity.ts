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

@Entity()
export class Session {
  @PrimaryGeneratedColumn('uuid')
  session_id: string;

  @Column()
  session_name: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column()
  created_by: string;

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

  @OneToMany(() => UserSession, (userSession) => userSession.session)
  user_sessions: UserSession[];

  @OneToMany(() => SessionDeck, (sessionDeck) => sessionDeck.session)
  session_decks: SessionDeck[];

  @OneToMany(() => Story, (story) => story.session)
  stories: Story[];
}
