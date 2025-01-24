import { Module } from '@nestjs/common';
import { PokerWsModule } from './poker-ws/poker-ws.module';
import { PokerModule } from './poker/poker.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envs } from './commons/envs';
import { CacheModule } from '@nestjs/cache-manager';

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
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
