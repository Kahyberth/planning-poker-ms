import { Module } from '@nestjs/common';
import { PokerWsService } from './poker-ws.service';
import { PokerWsGateway } from './poker-ws.gateway';

@Module({
  providers: [PokerWsGateway, PokerWsService],
})
export class PokerWsModule {}
