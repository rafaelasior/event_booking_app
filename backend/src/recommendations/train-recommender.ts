import { NestFactory } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { RecommendationsService } from './recommendations.service';

async function bootstrap() {
  // Μόνο το PrismaModule: με όλο το AppModule θα έτρεχε και το onModuleInit του service
  const app = await NestFactory.createApplicationContext(PrismaModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const prismaService = app.get(PrismaService);
    const recommendationsService = new RecommendationsService(prismaService);
    const result = await recommendationsService.trainAndSaveModel();

    console.log('Recommendation model trained.');
    console.log(`Model path: ${result.modelPath}`);
    console.log(`Total interactions: ${result.totalInteractions}`);

    const evaluation = await recommendationsService.evaluate();
    const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

    console.log(`\nEvaluation (leave-one-out, ${evaluation.users} users):`);
    console.log(
      '  RMSE per epoch: ' +
        evaluation.rmseByEpoch
          .map((rmse, index) => ({ epoch: index + 1, rmse }))
          .filter(({ epoch }) => epoch === 1 || epoch % 10 === 0)
          .map(({ epoch, rmse }) => `${epoch}: ${rmse.toFixed(3)}`)
          .join(', '),
    );
    console.log(`  HR@10 model:      ${percent(evaluation.modelHitRate)}`);
    console.log(`  HR@10 popularity: ${percent(evaluation.popularityHitRate)}`);
    console.log(`  HR@10 random:     ${percent(evaluation.randomHitRate)}`);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('Failed to train recommendation model:', error);
  process.exit(1);
});
