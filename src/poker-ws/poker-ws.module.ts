import { Module } from '@nestjs/common';
import { PokerWsService } from './poker-ws.service';
import { PokerWsGateway } from './poker-ws.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from 'src/poker/entities/session.entity';
import { Chat } from 'src/poker/entities/chat.entity';
import { Vote } from 'src/poker/entities/vote.entity';
import { Join_Session } from 'src/poker/entities/join.session.entity';
import { Decks } from 'src/poker/entities/decks.entity';
import { History } from 'src/poker/entities/history.entity';

@Module({
  providers: [PokerWsGateway, PokerWsService],
  imports: [
    TypeOrmModule.forFeature([
      Session,
      Chat,
      Vote,
      Join_Session,
      Decks,
      History,
    ]),
  ],
})
export class PokerWsModule {}
