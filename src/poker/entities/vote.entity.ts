import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Session } from './session.entity';

@Entity()
@Unique(['story_id', 'user_id'])
export class Vote {
  @PrimaryGeneratedColumn('uuid')
  vote_id: string;

  @Column()
  story_id: number;

  @Column()
  user_id: string;

  @Column()
  card_value: string;

  @Column()
  final_value: string;

  @CreateDateColumn({ type: 'timestamp' })
  voted_at: Date;

  @ManyToOne(() => Session, (session) => session.vote)
  session: Session;
}
