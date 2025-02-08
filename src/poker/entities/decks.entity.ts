import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { DecksType } from 'src/commons/types/decks.type';
import { Session } from './session.entity';

@Entity()
export class Decks {
  @PrimaryGeneratedColumn('uuid')
  deck_id: string;

  @Column({
    type: 'jsonb',
  })
  deck_cards: DecksType[];

  @OneToOne(() => Session, (session) => session.decks)
  session: Session;
}
