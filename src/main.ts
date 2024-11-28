import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { envs } from './commons/envs';

async function bootstrap() {
  //TODO: Aqui tiene que hacer algo para conectarlo con Nats.io y que funcione con microservicios!!!!
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: envs.ORIGIN_CORS,
    credentials: true,
  });
  await app.listen(8080);
}
bootstrap();
