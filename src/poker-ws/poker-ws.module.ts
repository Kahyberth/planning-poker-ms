import { Module } from '@nestjs/common';
import { PokerWsService } from './poker-ws.service';
import { PokerWsGateway } from './poker-ws.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from 'src/poker/entities/session.entity';
import { Chat } from 'src/poker/entities/chat.entity';
import { Vote } from 'src/poker/entities/vote.entity';
import { Join_Session } from 'src/poker/entities/join.session.entity';

@Module({
  providers: [PokerWsGateway, PokerWsService],
  imports: [TypeOrmModule.forFeature([Session, Chat, Vote, Join_Session])],
})
export class PokerWsModule {}
