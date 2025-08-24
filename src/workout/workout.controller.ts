import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkoutService } from './workout.service';
import { CreateWorkoutRecordDto } from './dto/create-workout-record.dto';
import { UpdateWorkoutRecordDto } from './dto/update-workout-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BodyPart } from './schemas/workout-record.schema';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

@ApiTags('健身紀錄')
@Controller('workout-records')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WorkoutController {
  constructor(private readonly workoutService: WorkoutService) {}

  @Post()
  @ApiOperation({ summary: '建立健身紀錄' })
  create(@Request() req, @Body() dto: CreateWorkoutRecordDto) {
    return this.workoutService.create(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '取得用戶的健身紀錄' })
  findAll(@Request() req, @Query('date') date?: string) {
    return this.workoutService.findAll(req.user.userId, date);
  }

  @Get('daily-summary')
  @ApiOperation({ summary: '取得每日健身摘要' })
  getDailySummary(@Request() req, @Query('date') date: string) {
    return this.workoutService.getDailySummary(req.user.userId, date);
  }

  @Get(':id')
  @ApiOperation({ summary: '根據 ID 取得健身紀錄' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.workoutService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新健身紀錄' })
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateWorkoutRecordDto) {
    return this.workoutService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '刪除健身紀錄' })
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

  // --- 使用者自訂動作 ---
  @Get('user/exercises')
  @ApiOperation({ summary: '取得使用者自訂動作（可用部位過濾）' })
  getUserExercises(@Request() req, @Query('bodyPart') bodyPart?: BodyPart) {
    return this.workoutService.getUserExercises(req.user.userId, bodyPart);
  }

  @Post('user/exercises')
  @ApiOperation({ summary: '新增使用者自訂動作' })
  addUserExercise(
    @Request() req,
    @Body() body: { name: string; bodyPart: BodyPart },
  ) {
    return this.workoutService.addUserExercise(req.user.userId, body);
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
}


