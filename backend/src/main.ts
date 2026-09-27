import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // σερβίρει τα ανεβασμένα αρχεία στο http://localhost:3000/uploads/...
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  
// Global ValidationPipe: τρέχει πριν από κάθε route handler.
// 1. Μετατρέπει το plain JSON body σε instance της κλάσης DTO (class-transformer).
// 2. Εκτελεί τους κανόνες των decorators, π.χ. @IsString, @MinLength (class-validator).
// 3. Σε αποτυχία πετάει BadRequestException -> 400 και ο handler δεν καλείται.
// whitelist: true -> αφαιρεί properties χωρίς validation decorator (προστασία
// από mass assignment, π.χ. αν ο client στείλει roles ή isAdmin).
  app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,  // 400 αντί για σιωπηλό strip
  transform: true,             // "5" → 5 βάσει του τύπου του DTO
  }));

  //communication between frontend and backend
  app.enableCors({
    origin: ['http://localhost:4200'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
