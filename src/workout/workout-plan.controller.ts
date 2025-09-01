import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkoutService } from './workout.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto';

@ApiTags('課表規劃 (Workout Plans)')
@Controller('workout-plans')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WorkoutPlanController {
  constructor(private readonly workoutService: WorkoutService) {}

  @Post()
  @ApiOperation({ summary: '建立新的課表' })
  create(@Request() req, @Body() createWorkoutPlanDto: CreateWorkoutPlanDto) {
    return this.workoutService.createWorkoutPlan(
      createWorkoutPlanDto,
      req.user.userId,
    );
  }

  @Post('bulk')
  @ApiOperation({ summary: '批次建立課表（每日/每週）' })
  createBulk(
    @Request() req,
    @Body()
    body: {
      name: string;
      exercises: any[];
      startDate: string; // YYYY-MM-DD
      endDate: string;   // YYYY-MM-DD
      recurrence: 'daily' | 'weekly';
      weekdays?: number[]; // 0-6
    },
  ) {
    return this.workoutService.createWorkoutPlansBulk(body, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: '取得使用者的課表' })
  @ApiQuery({ name: 'date', required: false, description: '過濾特定日期的課表 YYYY-MM-DD' })
  findAll(@Request() req, @Query('date') date?: string) {
    return this.workoutService.getWorkoutPlans(req.user.userId, date);
  }

  // 注意：需放在動態 :id 路由之前
  @Get('marked-dates')
  @ApiOperation({ summary: '取得指定月份的課表日期（預設僅未開始）' })
  @ApiQuery({ name: 'year', required: true, type: Number, description: '年份，例如 2025' })
  @ApiQuery({ name: 'month', required: true, type: Number, description: '月份 1-12' })
  @ApiQuery({ name: 'status', required: false, description: 'pending 或 completed，預設 pending' })
  getMarkedDates(
    @Request() req,
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('status') status?: 'pending' | 'completed',
  ) {
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    return this.workoutService.getPlannedDates(req.user.userId, yearNum, monthNum, status || 'pending');
  }

  @Get(':id')
  @ApiOperation({ summary: '根據 ID 取得單一課表' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.workoutService.findWorkoutPlanById(id, req.user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新課表' })
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateWorkoutPlanDto: Partial<CreateWorkoutPlanDto>,
  ) {
    return this.workoutService.updateWorkoutPlan(
      id,
      updateWorkoutPlanDto,
      req.user.userId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: '刪除課表' })
  remove(@Request() req, @Param('id') id: string) {
    return this.workoutService.deleteWorkoutPlan(id, req.user.userId);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: '將課表標示為完成' })
  complete(@Request() req, @Param('id') id: string) {
    return this.workoutService.completeWorkoutPlan(id, req.user.userId);
  }
}
