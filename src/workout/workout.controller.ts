import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, ConflictException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkoutService } from './workout.service';
import { CreateWorkoutRecordDto } from './dto/create-workout-record.dto';
import { UpdateWorkoutRecordDto } from './dto/update-workout-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BodyPart, WorkoutType } from './schemas/workout-record.schema';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, Goal } from '../auth/schemas/user.schema';

@ApiTags('運動紀錄')
@Controller('workout-records')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WorkoutController {
  constructor(
    private readonly workoutService: WorkoutService,
    private readonly configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

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

  @Get('range')
  @ApiOperation({ summary: '依日期區間取得運動紀錄（含重訓）' })
  @ApiQuery({ name: 'startDate', required: false, description: '起始日期 YYYY-MM-DD（預設 7 天前）' })
  @ApiQuery({ name: 'endDate', required: false, description: '結束日期 YYYY-MM-DD（預設今天）' })
  @ApiQuery({ name: 'range', required: false, description: '快捷範圍 7d | 30d' })
  @ApiQuery({ name: 'type', required: false, enum: WorkoutType, description: '過濾運動類型' })
  async findRange(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('range') range?: '7d' | '30d',
    @Query('type') type?: WorkoutType,
  ) {
    let start: Date;
    let end: Date;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else if (range === '30d') {
      end = new Date();
      start = new Date();
      start.setDate(end.getDate() - 29);
    } else {
      end = new Date();
      start = new Date();
      start.setDate(end.getDate() - 6);
    }
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
    return this.workoutService.findRange(req.user.userId, start, end, type);
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

  @Post('ai/advice')
  @ApiOperation({ summary: '依範圍與摘要傳入，取得重訓 AI 建議（Gemini）' })
  async getWorkoutAdvice(
    @Request() req,
    @Body() body: { range?: '7d' | '30d'; startDate?: string; endDate?: string },
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    const now = new Date();
    let start: Date;
    let end: Date;
    if (body?.startDate && body?.endDate) {
      start = new Date(body.startDate);
      end = new Date(body.endDate);
    } else if (body?.range === '30d') {
      end = new Date();
      start = new Date();
      start.setDate(end.getDate() - 29);
    } else { // default 7d
      end = new Date();
      start = new Date();
      start.setDate(end.getDate() - 6);
    }
    // normalize to day boundaries
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);

    const [summary, user] = await Promise.all([
      this.workoutService.aggregateResistanceSummary(req.user.userId, start, end),
      this.userModel.findById(req.user.userId).lean(),
    ]);
    const userGoal: Goal | undefined = user?.goal;
    const goalText = userGoal === 'muscle_gain' ? '增肌' : userGoal === 'weight_loss' ? '減重' : '維持';

    const rangeLabel = body?.startDate && body?.endDate
      ? `${body.startDate} ~ ${body.endDate}`
      : (body?.range === '30d' ? '近一月' : '近一週');

    const prompt = `你是專業重量訓練教練。用繁體中文 Markdown 回覆（最多 8 點，每點不超過 35 字），直接條列重點，不加開場結語。請依使用者目標「${goalText}」提出建議，兼顧：訓練量與恢復、部位分配（是否失衡）、下週可執行安排（天數、動作或組數微調）。\n\n` +
      `輸入區間：${rangeLabel}\n` +
      `總組數：${summary.totalSets}\n` +
      `總訓練量(kg·reps)：${summary.totalVolume}\n` +
      `訓練天數：${summary.days}\n` +
      `部位分佈：${JSON.stringify(summary.byBodyPart)}\n` +
      `Top 動作：${JSON.stringify(summary.topExercises)}\n` +
      `\n格式要求：\n- 僅輸出 Markdown，無程式碼圍欄\n- 每點以「- 」開頭\n- 內容精煉、具體可執行\n- 與目標「${goalText}」一致（如增肌→漸進超負荷；減重→控量與恢復）`;

    if (!apiKey) {
      const advice = `未設定 GEMINI_API_KEY。根據你的數據：\n- 本期總組數 ${summary.totalSets}，總量 ${summary.totalVolume}。\n- 部位分佈顯示：${summary.byBodyPart.map((b: any) => `${b.bodyPart} ${b.sets}組`).join('、') || '資料不足'}。\n- 建議：\n  1) 維持每部位每週 10–20 組為原則，缺少的部位逐步補齊。\n  2) 安排 1–2 天全面休息或低強度日，確保恢復。\n  3) Top 動作可逐週小幅進步（多 1–2 reps 或 2.5–5kg）。`;
      return { advice };
    }

    const modelName = 'gemini-2.0-flash-lite';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    let text = result.response.text() || '';
    // 移除可能的程式碼區塊標記並裁切過長輸出
    text = text.replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, ''));
    text = text.replace(/```/g, '').trim();
    if (text.length > 1500) text = text.slice(0, 1500);
    return { advice: text };
  }
}
