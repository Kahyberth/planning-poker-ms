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
        servers: ['nats://localhost:4222'],
      },
    },
  );
  await app.listen().then(() => {
    logger.log(`Poker-ms is listening on ${envs.PORT}`);
  });

  const ws = await NestFactory.create(AppModule);
  ws.enableCors();
  await ws.listen(envs.WS_PORT).then(() => {
    logger.log(`Poker-websockets is listening on ${envs.WS_PORT}`);
  });
}
bootstrap();
