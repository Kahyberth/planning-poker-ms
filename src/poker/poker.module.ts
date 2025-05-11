import { Module } from '@nestjs/common';
import { PokerService } from './poker.service';
import { PokerController } from './poker.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './entities/session.entity';
import { Vote } from './entities/vote.entity';
import { Chat } from './entities/chat.entity';
import { Join_Session } from './entities/join.session.entity';
import { Decks } from './entities/decks.entity';
import { History } from './entities/history.entity';
import { MagicLinkService } from 'src/magic-link-service/magic-link-service.service';
import { EstimationService } from 'src/estimation/estimation.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { envs } from 'src/commons/envs';

@Module({
  controllers: [PokerController],
  providers: [PokerService, MagicLinkService, EstimationService],
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
  exports: [PokerService]
})
export class PokerModule {}
