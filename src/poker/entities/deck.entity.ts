import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Card } from './card.entity';
import { SessionDeck } from './session.deck.entity';

@Entity()
export class Deck {
  @PrimaryGeneratedColumn('uuid')
  deck_id: string;

  @Column()
  deck_name: string;

  @Column()
  created_by: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column()
  history_id: string;

  @OneToMany(() => Card, (card) => card.deck)
  cards: Card[];

  @OneToMany(() => SessionDeck, (sessionDeck) => sessionDeck.deck)
  session_decks: SessionDeck[];
}
