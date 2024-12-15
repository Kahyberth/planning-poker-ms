import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Session } from './session.entity';
import { Deck } from './deck.entity';

@Entity()
export class SessionDeck {
  @PrimaryColumn()
  session_id: string;

  @PrimaryColumn()
  deck_id: string;

  @Column()
  history_id: string;

  @ManyToOne(() => Session, (session) => session.session_decks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @ManyToOne(() => Deck, (deck) => deck.session_decks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'deck_id' })
  deck: Deck;
}
