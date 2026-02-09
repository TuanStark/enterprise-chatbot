// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import { config } from './common/config';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 100 * 1024 * 1024,
    }),
  );

  await app.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024,
    },
  });

  await app.listen(config.PORT);
  console.log(`Application is running on: ${config.PORT}`);
}
bootstrap();