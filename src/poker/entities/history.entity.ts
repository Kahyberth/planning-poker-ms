import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Session } from './session.entity';

@Entity()
export class History {
  @PrimaryGeneratedColumn('uuid')
  history_id: string;

  @Column('text')
  story_id: string;

  @Column()
  card_value: string;

  @Column()
  history_date: Date;

  @ManyToOne(() => Session, (session) => session.histories)
  @JoinColumn({ name: 'session_id' })
  session: Session;
}
