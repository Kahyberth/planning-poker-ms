import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  //TODO: Aqui tiene que hacer algo para conectarlo con Nats.io y que funcione con microservicios!!!!
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
