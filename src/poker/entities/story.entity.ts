import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Session } from './session.entity';
import { Vote } from './vote.entity';

export enum StoryStatus {
  PENDING = 'pending',
  ESTIMATED = 'estimated',
}

@Entity()
export class Story {
  @PrimaryGeneratedColumn('uuid')
  story_id: string;

  @Column()
  session_id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  acceptance_criteria: string;

  @Column({ type: 'int', nullable: true })
  priority: number;

  @Column({
    type: 'enum',
    enum: StoryStatus,
    default: StoryStatus.PENDING,
  })
  status: StoryStatus;

  @Column({ nullable: true })
  final_estimate: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column()
  history_id: string; // Reference to external History.history_id (string)

  @ManyToOne(() => Session, (session) => session.stories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @OneToMany(() => Vote, (vote) => vote.story)
  votes: Vote[];
}
