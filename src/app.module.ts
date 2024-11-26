import { Module } from '@nestjs/common';
import { PokerWsModule } from './poker-ws/poker-ws.module';
import { PokerModule } from './poker/poker.module';

@Module({
  imports: [PokerWsModule, PokerModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
