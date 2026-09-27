import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { RecommendationsService } from './recommendations.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const prismaService = app.get(PrismaService);
    const recommendationsService = new RecommendationsService(prismaService);
    const result = await recommendationsService.trainAndSaveModel();

    console.log('Recommendation model trained.');
    console.log(`Model path: ${result.modelPath}`);
    console.log(`Dataset interactions: ${result.datasetInteractions}`);
    console.log(`App interactions: ${result.appInteractions}`);
    console.log(`Total interactions: ${result.totalInteractions}`);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('Failed to train recommendation model:', error);
  process.exit(1);
});
