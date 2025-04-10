import { Module } from '@nestjs/common';
import { PokerWsModule } from './poker-ws/poker-ws.module';
import { PokerModule } from './poker/poker.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envs } from './commons/envs';
import { CacheModule } from '@nestjs/cache-manager';
import { MagicLinkService } from './magic-link-service/magic-link-service.service';
import { EstimationService } from './estimation/estimation.service';

@Module({
  imports: [
    PokerWsModule,
    CacheModule.register({
      isGlobal: true,
    }),
    PokerModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: envs.DB_HOST,
      port: 5432,
      username: envs.DB_USERNAME,
      password: envs.DB_PASSWORD,
      database: envs.DB_DATABASE,
      synchronize: true,
      extra: {
        ssl: true,
      },
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
    }),
  ],
  controllers: [],
  providers: [MagicLinkService, EstimationService],
})
export class AppModule {}
