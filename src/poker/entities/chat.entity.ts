import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

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

  @Column('text')
  session_id: string;
}
