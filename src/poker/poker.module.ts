import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstimationService } from '../estimation/estimation.service';
import { Chat } from './entities/chat.entity';
import { Decks } from './entities/decks.entity';
import { History } from './entities/history.entity';
import { Join_Session } from './entities/join.session.entity';
import { Session } from './entities/session.entity';
import { Vote } from './entities/vote.entity';
import { PokerController } from './poker.controller';
import { PokerService } from './poker.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { envs } from 'src/commons/envs';

@Module({
  controllers: [PokerController],
  providers: [PokerService, EstimationService],
  imports: [
    TypeOrmModule.forFeature([
      Session,
      Chat,
      Vote,
      Join_Session,
      Decks,
      History,
    ]),
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
  exports: [PokerService],
})
export class PokerModule {}
