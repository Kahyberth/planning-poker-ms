import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstimationService } from './estimation/estimation.service';
import { PokerWsModule } from './poker-ws/poker-ws.module';
import { PokerModule } from './poker/poker.module';
import { envs } from './commons/envs';

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
      port: envs.DB_PORT,
      username: envs.DB_USERNAME,
      password: envs.DB_PASSWORD,
      database: envs.DB_DATABASE,
      synchronize: true,
      extra: {
        ssl: {
          rejectUnauthorized: false,
        },
      },
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
    }),
  ],
  controllers: [],
  providers: [EstimationService],
})
export class AppModule {}
