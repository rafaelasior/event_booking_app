import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../guards/jwt-auth/jwt-auth.guard';

type RequestWithUser = {
  user: {
    userId: number;
    roles: string[];
  };
};

@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get()
  findForCurrentUser(@Req() request: RequestWithUser) {
    return this.recommendationsService.findForUser(request.user.userId);
  }
}