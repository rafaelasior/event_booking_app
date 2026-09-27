import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

// Το @nestjs/passport είναι ES module και το jest δεν το φορτώνει.
// Εδώ δεν χρειάζεται ο πραγματικός guard, αφού καλούμε τη μέθοδο κατευθείαν.
jest.mock('../guards/jwt-auth/jwt-auth.guard', () => ({
  JwtAuthGuard: class {},
}));

describe('RecommendationsController', () => {
  let controller: RecommendationsController;
  const service = { findForUser: jest.fn().mockResolvedValue([]) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [{ provide: RecommendationsService, useValue: service }],
    }).compile();

    controller = module.get<RecommendationsController>(RecommendationsController);
  });

  it('ζητάει προτάσεις για τον συνδεδεμένο χρήστη', async () => {
    await controller.findForCurrentUser({ user: { userId: 7, roles: ['user'] } });

    expect(service.findForUser).toHaveBeenCalledWith(7);
  });
});
