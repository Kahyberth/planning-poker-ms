import { Module } from '@nestjs/common';
import { PokerWsService } from './poker-ws.service';
import { PokerWsGateway } from './poker-ws.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '../poker/entities/session.entity';
import { Chat } from '../poker/entities/chat.entity';
import { Vote } from '../poker/entities/vote.entity';
import { Join_Session } from '../poker/entities/join.session.entity';
import { Decks } from '../poker/entities/decks.entity';
import { History } from '../poker/entities/history.entity';
import { PokerModule } from '../poker/poker.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { envs } from '../commons/envs';

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
    PokerModule,
    ClientsModule.register([
      {
        name: 'NATS_SERVICE',
        transport: Transport.NATS,
        options: {
          servers: envs.NATS_SERVERS,
        },
      },
    ]),
  ],
})
export class PokerWsModule {}
