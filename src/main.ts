import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.getHttpAdapter().getInstance().register(require('@fastify/multipart'), {
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  });

  await app.listen(process.env.PORT ?? 3000);

  console.log(`Application is running on: ${process.env.PORT ?? 3000}`);
}
bootstrap();
