import { Module } from '@nestjs/common';
import { PokerService } from './poker.service';
import { PokerController } from './poker.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card } from './entities/card.entity';
import { Deck } from './entities/deck.entity';
import { SessionDeck } from './entities/session.deck.entity';
import { Session } from './entities/session.entity';
import { Story } from './entities/story.entity';
import { UserSession } from './entities/user.session.entity';
import { Vote } from './entities/vote.entity';

@Module({
  controllers: [PokerController],
  providers: [PokerService],
  imports: [
    TypeOrmModule.forFeature([
      Card,
      Deck,
      SessionDeck,
      Session,
      Story,
      UserSession,
      Vote,
    ]),
  ],
})
export class PokerModule {}
