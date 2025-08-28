import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min, Max, ValidateNested } from 'class-validator';
import { BodyPart, WorkoutType, CardioType } from '../schemas/workout-record.schema';

export class CreateWorkoutSetDto {
  @ApiProperty({ description: '重量(kg)', example: 60 })
  @IsNumber()
  @Min(0)
  weight: number;

  @ApiProperty({ description: '次數', example: 10 })
  @IsNumber()
  @Min(1)
  reps: number;

  @ApiProperty({ description: '休息秒數', required: false, example: 90 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  restSeconds?: number;

  @ApiProperty({ description: 'RPE (1-10)', required: false, example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  rpe?: number;

  @ApiProperty({ description: '是否完成', required: false, example: false })
  @IsOptional()
  completed?: boolean;
}

export class CreateWorkoutExerciseDto {
  @ApiProperty({ description: '動作名稱（由系統維護）', example: '臥推 (Bench Press)' })
  @IsString()
  @IsNotEmpty()
  exerciseName: string;

  @ApiProperty({ description: '身體部位', enum: BodyPart, example: BodyPart.Chest })
  @IsEnum(BodyPart)
  @IsNotEmpty()
  bodyPart: BodyPart;

  @ApiProperty({ description: '動作 ID' })
  @IsMongoId()
  @IsNotEmpty()
  exerciseId: string;

  @ApiProperty({ type: [CreateWorkoutSetDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkoutSetDto)
  sets: CreateWorkoutSetDto[];
}

// 重訓專用 DTO
export class CreateResistanceDataDto {
  @ApiProperty({ type: [CreateWorkoutExerciseDto], required: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkoutExerciseDto)
  exercises: CreateWorkoutExerciseDto[];

  @ApiProperty({ description: '總休息秒數', required: false, example: 600 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalRestSeconds?: number;
}

// 有氧運動專用 DTO
export class CreateCardioDataDto {
  @ApiProperty({ description: '有氧運動類型', enum: CardioType, example: CardioType.Running })
  @IsEnum(CardioType)
  @IsNotEmpty()
  cardioType: CardioType;

  @ApiProperty({ description: '距離（公里）', required: false, example: 5.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  distance?: number;

  @ApiProperty({ description: '強度等級（1-10）', example: 7 })
  @IsNumber()
  @Min(1)
  @Max(10)
  intensity: number;

  @ApiProperty({ description: '平均心率', required: false, example: 150 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  averageHeartRate?: number;

  @ApiProperty({ description: '最大心率', required: false, example: 180 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxHeartRate?: number;

  @ApiProperty({ description: '消耗卡路里（估算）', required: false, example: 400 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  caloriesBurned?: number;

  @ApiProperty({ description: '運動地點', required: false, example: '中央公園' })
  @IsOptional()
  @IsString()
  location?: string;
}

// 柔韌性運動專用 DTO
export class CreateFlexibilityDataDto {
  @ApiProperty({ description: '體式或動作名稱', type: [String], example: ['戰士式', '樹式'] })
  @IsArray()
  @IsString({ each: true })
  poses: string[];

  @ApiProperty({ description: '難度等級（1-10）', required: false, example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  difficulty?: number;

  @ApiProperty({ description: '重點部位', type: [String], example: ['核心', '腿部'] })
  @IsArray()
  @IsString({ each: true })
  focusAreas: string[];

  @ApiProperty({ description: '放鬆程度（1-10）', required: false, example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  relaxationLevel?: number;
}

export class CreateWorkoutRecordDto {
  @ApiProperty({ description: '日期', example: '2024-01-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: '運動類型', enum: WorkoutType, example: WorkoutType.Resistance })
  @IsEnum(WorkoutType)
  @IsNotEmpty()
  type: WorkoutType;

  @ApiProperty({ description: '運動持續時間（分鐘）', required: false, example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiProperty({ description: '備註', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  // 各運動類型專用數據
  @ApiProperty({ description: '重訓數據', type: CreateResistanceDataDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateResistanceDataDto)
  resistanceData?: CreateResistanceDataDto;

  @ApiProperty({ description: '有氧數據', type: CreateCardioDataDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCardioDataDto)
  cardioData?: CreateCardioDataDto;

  @ApiProperty({ description: '柔韌性數據', type: CreateFlexibilityDataDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateFlexibilityDataDto)
  flexibilityData?: CreateFlexibilityDataDto;

  // 向後兼容的舊欄位（標記為 deprecated）
  @ApiProperty({ type: [CreateWorkoutExerciseDto], required: false, deprecated: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkoutExerciseDto)
  exercises?: CreateWorkoutExerciseDto[];

  @ApiProperty({ description: '本次訓練總時長（秒）', required: false, example: 3600, deprecated: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  workoutDurationSeconds?: number;

  @ApiProperty({ description: '總休息秒數', required: false, example: 600, deprecated: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalRestSeconds?: number;
}


