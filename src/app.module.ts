import { Module } from '@nestjs/common';
import { PokerWsModule } from './poker-ws/poker-ws.module';
import { PokerModule } from './poker/poker.module';
import { TypeOrmModule } from './database/typeorm.module';

@Module({
  imports: [PokerWsModule, PokerModule, TypeOrmModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
