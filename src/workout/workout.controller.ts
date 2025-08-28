import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, ConflictException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkoutService } from './workout.service';
import { CreateWorkoutRecordDto } from './dto/create-workout-record.dto';
import { UpdateWorkoutRecordDto } from './dto/update-workout-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BodyPart, WorkoutType } from './schemas/workout-record.schema';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

@ApiTags('運動紀錄')
@Controller('workout-records')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WorkoutController {
  constructor(private readonly workoutService: WorkoutService) {}

  @Post()
  @ApiOperation({ summary: '建立運動紀錄' })
  create(@Request() req, @Body() dto: CreateWorkoutRecordDto) {
    return this.workoutService.create(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '取得用戶的運動紀錄' })
  @ApiQuery({ name: 'date', required: false, description: '過濾日期 YYYY-MM-DD' })
  @ApiQuery({ name: 'type', required: false, enum: WorkoutType, description: '過濾運動類型' })
  findAll(
    @Request() req, 
    @Query('date') date?: string,
    @Query('type') type?: WorkoutType
  ) {
    return this.workoutService.findAll(req.user.userId, date, type);
  }

  @Get('daily-summary')
  @ApiOperation({ summary: '取得每日運動摘要' })
  @ApiQuery({ name: 'date', required: true, description: '查詢日期 YYYY-MM-DD' })
  getDailySummary(@Request() req, @Query('date') date: string) {
    return this.workoutService.getDailySummary(req.user.userId, date);
  }

  @Get('marked-dates')
  @ApiOperation({ summary: '取得指定月份有運動紀錄的日期' })
  @ApiQuery({ name: 'year', required: true, type: Number, description: '年份，例如 2024' })
  @ApiQuery({ name: 'month', required: true, type: Number, description: '月份，例如 8' })
  getMarkedDates(
    @Request() req,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    return this.workoutService.getMarkedDates(req.user.userId, yearNum, monthNum);
  }

  @Get(':id')
  @ApiOperation({ summary: '根據 ID 取得運動紀錄' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.workoutService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新運動紀錄' })
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateWorkoutRecordDto) {
    return this.workoutService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '刪除運動紀錄' })
  remove(@Request() req, @Param('id') id: string) {
    return this.workoutService.remove(req.user.userId, id);
  }

  @Get('common/exercises')
  @ApiOperation({ summary: '取得（內建＋使用者自訂）動作清單（可用部位過濾）' })
  getCommonExercises(@Request() req, @Query('bodyPart') bodyPart?: BodyPart) {
    // 為了相容前端既有呼叫，這裡直接回傳合併清單
    return this.workoutService.getAllExercises(req.user.userId, bodyPart);
  }

  @Get('exercises')
  @ApiOperation({ summary: '取得內建＋使用者自訂動作清單（可部位過濾）' })
  getAllExercises(@Request() req, @Query('bodyPart') bodyPart?: BodyPart) {
    return this.workoutService.getAllExercises(req.user.userId, bodyPart);
  }

  @Get('common/body-parts')
  @ApiOperation({ summary: '取得訓練部位列舉' })
  getBodyParts() {
    return Object.values(BodyPart);
  }

  @Get('common/workout-types')
  @ApiOperation({ summary: '取得運動類型列舉' })
  getWorkoutTypes() {
    return Object.values(WorkoutType);
  }

  // --- 使用者自訂動作 ---
  @Get('user/exercises')
  @ApiOperation({ summary: '取得使用者自訂動作（可用部位過濾）' })
  getUserExercises(@Request() req, @Query('bodyPart') bodyPart?: BodyPart) {
    return this.workoutService.getUserExercises(req.user.userId, bodyPart);
  }

  @Post('user/exercises')
  @ApiOperation({ summary: '新增使用者自訂動作' })
  async addUserExercise(
    @Request() req,
    @Body() body: { name: string; bodyPart: BodyPart },
  ) {
    try {
      return await this.workoutService.addUserExercise(req.user.userId, body);
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('您已經有相同名稱的自訂項目了');
      }
      throw error;
    }
  }

  @Patch('user/exercises/:id')
  @ApiOperation({ summary: '更新使用者自訂動作' })
  updateUserExercise(@Request() req, @Param('id') id: string, @Body() body: Partial<{ name: string; bodyPart: BodyPart; isActive: boolean }>) {
    return this.workoutService.updateUserExercise(req.user.userId, id, body);
  }

  @Delete('user/exercises/:id')
  @ApiOperation({ summary: '停用/刪除使用者自訂動作' })
  removeUserExercise(@Request() req, @Param('id') id: string) {
    return this.workoutService.removeUserExercise(req.user.userId, id);
  }

  // 開發用：重新初始化運動項目種子數據
  @Post('reset-exercise-seeds')
  @ApiOperation({ summary: '重新初始化運動項目種子數據（開發用）' })
  resetExerciseSeeds() {
    return this.workoutService.resetExerciseSeeds();
  }
}


