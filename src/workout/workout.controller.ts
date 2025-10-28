import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, ConflictException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkoutService } from './workout.service';
import { CreateWorkoutRecordDto } from './dto/create-workout-record.dto';
import { UpdateWorkoutRecordDto } from './dto/update-workout-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BodyPart, WorkoutType } from './schemas/workout-record.schema';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, Goal } from '../auth/schemas/user.schema';
import { AiLoggingService } from '../ai-logging/ai-logging.service';
import { AiPromptService } from '../ai-prompt/ai-prompt.service';

@ApiTags('運動紀錄')
@Controller('workout-records')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WorkoutController {
  constructor(
    private readonly workoutService: WorkoutService,
    private readonly configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly aiLoggingService: AiLoggingService,
    private readonly aiPromptService: AiPromptService,
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
    const genderText = user?.gender === 'male' ? '男性' : user?.gender === 'female' ? '女性' : '其他/未填';
    const heightText = typeof user?.height === 'number' ? `${user.height} cm` : '未填';
    const weightText = typeof user?.weight === 'number' ? `${user.weight} kg` : '未填';
    const bmi = (typeof user?.height === 'number' && typeof user?.weight === 'number' && user.height > 0)
      ? Number((user.weight / Math.pow(user.height / 100, 2)).toFixed(1))
      : undefined;

    const rangeLabel = body?.startDate && body?.endDate
      ? `${body.startDate} ~ ${body.endDate}`
      : (body?.range === '30d' ? '近一月' : '近一週');

    const prompt = `你是專業重量訓練教練。用繁體中文 Markdown 回覆（最多 8 點，每點不超過 35 字），直接條列重點，不加開場結語。請依使用者目標「${goalText}」提出建議，兼顧：訓練量與恢復、部位分配（是否失衡）、下週可執行安排（天數、動作或組數微調）。\n\n` +
      `使用者資訊：性別：${genderText}；身高：${heightText}；體重：${weightText}${bmi ? `；BMI：${bmi}` : ''}\n` +
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
    // 取得/建立提示詞模板以便 logging 使用固定 promptId
    const adviceTemplate = await this.aiPromptService
      .getLatestPrompt('workout-advice')
      .catch(() => this.aiPromptService.createOrUpdatePrompt('workout-advice', '產生重訓建議（Markdown 條列、精簡、考量目標與恢復）。'));

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const usage = result.response.usageMetadata;
    let text = result.response.text() || '';
    // 移除可能的程式碼區塊標記並裁切過長輸出
    text = text.replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, ''));
    text = text.replace(/```/g, '').trim();
    if (text.length > 1500) text = text.slice(0, 1500);

    // 記錄 AI log（含 input/output）
    await this.aiLoggingService.createLog({
      userId: req.user.userId,
      model: modelName,
      promptId: adviceTemplate._id.toString(),
      apiResponse: text,
      parsedResponse: {
        input: { range: rangeLabel, goal: userGoal, summary },
        output: { advice: text },
      },
      inputTokens: usage?.promptTokenCount,
      outputTokens: usage?.candidatesTokenCount,
      status: 'success',
    });

    return { advice: text, input: { range: rangeLabel, goal: userGoal, summary, user: { gender: user?.gender, height: user?.height, weight: user?.weight, bmi } } };
  }

  @Post('ai/suggest-plan')
  @ApiOperation({ summary: '依日期區間與使用者可用動作，產生「建議課表」（不直接落盤）' })
  async suggestPlan(
    @Request() req,
    @Body() body: { range?: '7d' | '30d'; startDate?: string; endDate?: string; daysPerWeek?: number; advice?: string },
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    const user = await this.userModel.findById(req.user.userId).lean();
    const genderText = user?.gender === 'male' ? '男性' : user?.gender === 'female' ? '女性' : '其他/未填';
    const heightText = typeof user?.height === 'number' ? `${user.height} cm` : '未填';
    const weightText = typeof user?.weight === 'number' ? `${user.weight} kg` : '未填';
    const bmi = (typeof user?.height === 'number' && typeof user?.weight === 'number' && user.height > 0)
      ? Number((user.weight / Math.pow(user.height / 100, 2)).toFixed(1))
      : undefined;
    // 僅預排「未來一週」，且日期必須在今天之後
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() + 1); // 明天起
    start.setHours(0,0,0,0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // 接下來 7 天（含起日）
    end.setHours(23,59,59,999);

    // 取得使用者可用動作（內建＋自訂）
    const allExercises = await this.workoutService.getAllExercises(req.user.userId);
    const grouped: Record<string, { _id: string; name: string }[]> = {} as any;
    for (const ex of (allExercises || [])) {
      const bp = ex.bodyPart || 'other';
      if (!grouped[bp]) grouped[bp] = [];
      grouped[bp].push({ _id: String(ex._id), name: ex.name });
    }

    const days = Math.max(1, Math.min(7, body?.daysPerWeek || 3));
    const rangeLabel = `${start.toISOString().split('T')[0]} ~ ${end.toISOString().split('T')[0]}（僅安排未來一週）`;

    const formatSpec = {
      plans: [
        {
          name: '週一上肢',
          plannedDate: 'YYYY-MM-DD',
          exercises: [
            { exerciseName: '臥推', sets: [ { weight: 0, reps: 8, restSeconds: 90 }, { weight: 0, reps: 8, restSeconds: 90 }, { weight: 0, reps: 8, restSeconds: 90 } ] }
          ]
        }
      ]
    };

    const adviceText = (body?.advice || '').toString().slice(0, 2000); // 控制長度
    const adviceSegment = adviceText ? `以下為先前 AI 給的重點建議（Markdown 條列），請盡量反映在安排中：\n${adviceText}\n\n` : '';

    const prompt = `請使用下列可用「動作清單」安排 ${days} 堂課於區間 ${rangeLabel}（平均分散，日期需晚於今天）。每堂課 4~6 個動作，每動作 3~4 組，重量可為 0（由使用者自行調整）。\n\n` +
      `使用者資訊：性別：${genderText}；身高：${heightText}；體重：${weightText}${bmi ? `；BMI：${bmi}` : ''}\n` +
      adviceSegment +
      `嚴格規則：\n- 只能使用清單內的動作名稱（完全相同）\n- 產出 JSON（無多餘文字），格式與下列範例相同\n- plannedDate 必須在區間內，平均分散\n- 動作避免完全重複，覆蓋胸背腿肩等主要部位\n\n可用動作（依部位分組）：\n${JSON.stringify(grouped)}\n\nJSON 格式範例：\n${JSON.stringify(formatSpec)}`;
      `- 只能使用清單內的動作名稱（完全相同）\n- 產出 JSON（無多餘文字），格式與下列範例相同\n- plannedDate 必須在區間內，平均分散\n- 動作避免完全重複，覆蓋胸背腿肩等主要部位\n\n可用動作（依部位分組）：\n${JSON.stringify(grouped)}\n\nJSON 格式範例：\n${JSON.stringify(formatSpec)}`;

    const tryParse = (text: string) => {
      try { return JSON.parse(text); } catch { return JSON.parse(text.replace(/^```json\s*|```$/g, '').trim()); }
    };

    // 將各種常見結構統一抽取為 plans 陣列
    const extractPlans = (raw: any): any[] => {
      if (!raw) return [];
      // 1) 直接是 { plans: [...] }
      if (Array.isArray(raw.plans)) return raw.plans;
      // 2) 直接是 plan 物件
      if (raw.exercises && Array.isArray(raw.exercises)) return [raw];
      // 3) 頂層是陣列：每個元素可能是 { plans: [...] } 或 plan 物件
      if (Array.isArray(raw)) {
        const acc: any[] = [];
        for (const it of raw) {
          if (!it) continue;
          if (Array.isArray(it.plans)) acc.push(...it.plans);
          else if (it.exercises && Array.isArray(it.exercises)) acc.push(it);
        }
        if (acc.length > 0) return acc;
      }
      // 4) 嘗試在常見鍵中尋找
      const candidates = ['data', 'result', 'items', 'schedule', 'sessions'];
      for (const key of candidates) {
        const v = (raw as any)[key];
        if (Array.isArray(v)) {
          // 嘗試把元素當作 { plans } 或 plan
          const acc: any[] = [];
          for (const it of v) {
            if (!it) continue;
            if (Array.isArray(it.plans)) acc.push(...it.plans);
            else if (it.exercises && Array.isArray(it.exercises)) acc.push(it);
          }
          if (acc.length > 0) return acc;
        }
      }
      return [];
    };

    let out: any = null;
    let rawText: string | null = null;
    let usage: any = null;
    let planTemplateId: string | null = null;
    if (apiKey) {
      try {
        // 取得/建立提示詞模板供 logging 使用
        const planTemplate = await this.aiPromptService
          .getLatestPrompt('workout-suggest-plan')
          .catch(() => this.aiPromptService.createOrUpdatePrompt('workout-suggest-plan', '根據可用動作清單輸出 JSON 課表（限定清單、日期分散、每課 4-6 動作、每動作 3-4 組）。'));
        planTemplateId = planTemplate._id.toString();

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
        const result = await model.generateContent(prompt);
        usage = result.response.usageMetadata;
        rawText = result.response.text();
        out = tryParse(rawText);

        // 延後成功 log 到產出 safePlans 後，帶上 parsedResponse
      } catch (e) {
        // 記錄失敗 log（仍會 fallback）
        try {
          const planTemplate = await this.aiPromptService
            .getLatestPrompt('workout-suggest-plan')
            .catch(() => this.aiPromptService.createOrUpdatePrompt('workout-suggest-plan', '根據可用動作清單輸出 JSON 課表（限定清單、日期分散、每課 4-6 動作、每動作 3-4 組）。'));
          await this.aiLoggingService.createLog({
            userId: req.user.userId,
            model: 'gemini-2.0-flash-lite',
            promptId: planTemplate._id.toString(),
            status: 'error',
            errorMessage: (e as Error)?.message,
          });
        } catch {}
      }
    }

    // Fallback：簡易三分化（推/拉/腿）或四分（上/下/推/拉）
    if (!out) {
      const pick = (bp: string, n: number) => (grouped[bp] || []).slice(0, n).map((x) => x.name);
      const dates: string[] = [];
      const span = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (days)));
      for (let i = 0; i < days; i++) {
        const d = new Date(start.getTime() + i * span);
        d.setHours(12,0,0,0);
        dates.push(d.toISOString().split('T')[0]);
      }
      const sessions = [
        { name: '推', list: [...pick('chest', 3), ...pick('shoulders', 2), ...pick('arms', 1)] },
        { name: '拉', list: [...pick('back', 4), ...pick('arms', 2)] },
        { name: '腿', list: [...pick('legs', 5), ...pick('core', 1)] },
        { name: '上肢', list: [...pick('chest', 2), ...pick('back', 2), ...pick('shoulders', 2)] },
      ];
      out = { plans: dates.map((dt, i) => ({ name: `建議課表-${sessions[i % sessions.length].name}`, plannedDate: dt, exercises: sessions[i % sessions.length].list.slice(0,6).map((n) => ({ exerciseName: n, sets: [ { weight: 0, reps: 10, restSeconds: 90 }, { weight: 0, reps: 10, restSeconds: 90 }, { weight: 0, reps: 10, restSeconds: 90 } ] })) })) };
    }

    // 映射名稱 → id/bodyPart
    const nameMap: Record<string, { _id: string; bodyPart?: string }> = {};
    for (const ex of allExercises || []) nameMap[ex.name] = { _id: String(ex._id), bodyPart: ex.bodyPart };

    // 取得原始 plans，支援多種結構
    const rawPlans: any[] = extractPlans(out);

    const normalizeSet = (s: any) => ({
      weight: Number(s?.weight ?? 0) || 0,
      reps: Number(s?.reps ?? 10) || 10,
      restSeconds: Number(s?.restSeconds ?? 90) || 90,
    });

    const safePlans = (rawPlans || []).map((p: any) => {
      const dateStr = (p?.plannedDate || '').split('T')[0];
      const inRange = dateStr && new Date(dateStr) >= start && new Date(dateStr) <= end;
      const plannedDate = inRange ? dateStr : start.toISOString().split('T')[0];
      const exs = (p?.exercises || []).map((e: any) => {
        const meta = nameMap[e?.exerciseName];
        if (!meta) return null;
        const sets = Array.isArray(e?.sets) && e.sets.length > 0 
          ? e.sets.map(normalizeSet)
          : [ normalizeSet({}), normalizeSet({}), normalizeSet({}) ];
        return { exerciseName: e.exerciseName, exerciseId: meta._id, bodyPart: meta.bodyPart, sets };
      }).filter(Boolean);
      // 至少 3 個動作
      return { name: p?.name || '建議課表', plannedDate, exercises: exs.slice(0, 6) };
    }).filter((p: any) => (p.exercises || []).length >= 3);

    // 重新分配日期到未來一週且避免重複：平均分散
    const assignDates = (count: number): string[] => {
      if (count <= 0) return [];
      if (count === 1) return [start.toISOString().split('T')[0]];
      const dates: string[] = [];
      for (let i = 0; i < count; i++) {
        const ratio = i / (count - 1);
        const dayOffset = Math.round(ratio * 6);
        const d = new Date(start);
        d.setDate(start.getDate() + dayOffset);
        d.setHours(12,0,0,0);
        dates.push(d.toISOString().split('T')[0]);
      }
      // 去重（萬一天數和 count 比例導致重疊）
      return Array.from(new Set(dates));
    };

    if (safePlans.length > 0) {
      const slots = assignDates(Math.min(days, safePlans.length));
      for (let i = 0; i < safePlans.length; i++) {
        safePlans[i].plannedDate = slots[i % slots.length];
      }
    }

    // 成功 log（含 parsedResponse：input/output）
    if (apiKey && planTemplateId) {
      try {
        await this.aiLoggingService.createLog({
          userId: req.user.userId,
          model: 'gemini-2.0-flash-lite',
          promptId: planTemplateId,
          apiResponse: rawText || undefined,
          inputTokens: usage?.promptTokenCount,
          outputTokens: usage?.candidatesTokenCount,
          parsedResponse: { input: { range: rangeLabel, days, availableExercises: grouped, advice: adviceText || undefined, user: { gender: user?.gender, height: user?.height, weight: user?.weight, bmi } }, output: { plans: safePlans } },
          status: 'success',
        });
      } catch {}
    }

    return { plans: safePlans, input: { range: rangeLabel, days, availableExercises: grouped, advice: adviceText || undefined, user: { gender: user?.gender, height: user?.height, weight: user?.weight, bmi } } };
  }
}
