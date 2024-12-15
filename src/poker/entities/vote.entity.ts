import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Story } from './story.entity';

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

  @CreateDateColumn({ type: 'timestamp' })
  voted_at: Date;

  @Column()
  history_id: string;

  @ManyToOne(() => Story, (story) => story.votes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'story_id' })
  story: Story;
}
