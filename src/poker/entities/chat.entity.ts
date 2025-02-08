import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Session } from './session.entity';

@Entity()
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  chat_id: string;

  @Column('text')
  username: string;

  @Column('text')
  message: string;

  @CreateDateColumn({ type: 'timestamp' })
  message_date: string;

  @Column('text')
  user_id: string;

  @ManyToOne(() => Session, (session) => session.chats, { onDelete: 'CASCADE' })
  session: Session;
}
