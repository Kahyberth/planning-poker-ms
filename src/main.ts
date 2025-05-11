import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { envs } from './commons/envs';

async function bootstrap() {
  const logger = new Logger('Poker-ms');
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.NATS,
      options: {
        servers: envs.NATS_SERVERS,
      },
    },
  );
  await app.listen().then(() => {
    logger.log(`Poker-ms is listening on ${envs.PORT}`);
  });

  const ws = await NestFactory.create(AppModule);
  ws.enableCors({
    origin: envs.ORIGIN_CORS,
    methods: ['GET', 'POST'],
    credentials: true,
  });
  await ws.listen(envs.WS_PORT).then(() => {
    logger.log(`Poker-websockets is listening on ${envs.WS_PORT}`);
  });
}
bootstrap();
