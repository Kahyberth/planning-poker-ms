import { Module } from '@nestjs/common';
import { PokerService } from './poker.service';
import { PokerController } from './poker.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './entities/session.entity';
import { Vote } from './entities/vote.entity';
import { Chat } from './entities/chat.entity';
import { Join_Session } from './entities/join.session.entity';

@Module({
  controllers: [PokerController],
  providers: [PokerService],
  imports: [TypeOrmModule.forFeature([Session, Chat, Vote, Join_Session])],
})
export class PokerModule {}
