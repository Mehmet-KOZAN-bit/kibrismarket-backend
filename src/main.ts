import * as dotenv from 'dotenv';
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Enable CORS securely for specific domains
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Apply custom security headers (helmet equivalent)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use((req: any, res: any, next: any) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data: https://dmtpmnqwbxaqtrktycid.supabase.co https://firebasestorage.googleapis.com https://*.firebasestorage.app; style-src 'self' 'unsafe-inline';"
    );
    next();
  });

  // Enable strict global validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Use Global Prefix for versioning
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 KibrisMarket Backend API running on: http://localhost:${port}/api/v1`);
}
bootstrap();
