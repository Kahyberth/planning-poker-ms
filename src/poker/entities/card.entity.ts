import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Deck } from './deck.entity';

@Entity()
export class Card {
  @PrimaryGeneratedColumn('uuid')
  card_id: string;

  @Column()
  deck_id: string;

  @Column()
  value: string;

  @Column()
  sort_order: number;

  @ManyToOne(() => Deck, (deck) => deck.cards, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'deck_id' })
  deck: Deck;
}
