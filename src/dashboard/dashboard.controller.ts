
import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { DashboardDto } from './dto/dashboard.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get daily dashboard data' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved dashboard data.',
    type: DashboardDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDashboardData(@Request() req): Promise<DashboardDto> {
    const userId = req.user.userId;
    return this.dashboardService.getDashboardData(userId);
  }
}
