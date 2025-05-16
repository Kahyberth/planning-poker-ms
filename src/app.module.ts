import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstimationService } from './estimation/estimation.service';
import { PokerWsModule } from './poker-ws/poker-ws.module';
import { PokerModule } from './poker/poker.module';

@Module({
  imports: [
    PokerWsModule,
    CacheModule.register({
      isGlobal: true,
    }),
    PokerModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'admin',
      database: 'poker',
      synchronize: true,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
    }),
  ],
  controllers: [],
  providers: [EstimationService],
})
export class AppModule {}
