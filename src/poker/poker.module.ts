import { Module } from '@nestjs/common';
import { PokerService } from './poker.service';
import { PokerController } from './poker.controller';

@Module({
  controllers: [PokerController],
  providers: [PokerService],
})
export class PokerModule {}
