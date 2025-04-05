// nestjs
import { NestFactory } from '@nestjs/core';

// modules
import { AppModule } from './app.module';

// prisma
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function bootstrap() {
  let connected = false;
  let attempts = 0;
  
  // connect to database
  while (!connected && attempts < 5) {
    try {
      await prisma.$connect();
      connected = true;
      console.log('Successfully connected to database');
    } catch (error) {
      attempts++;
      console.log(`Database connection attempt ${attempts} failed. Retrying in 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
       
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
