import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsMongoId, IsNumber, IsOptional, IsString, Min, Max, ValidateNested } from 'class-validator';
import { BodyPart, WorkoutType, CardioType } from '../schemas/workout-record.schema';

export class UpdateWorkoutSetDto {
  @ApiProperty({ description: '重量(kg)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiProperty({ description: '次數', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  reps?: number;

  @ApiProperty({ description: '休息秒數', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  restSeconds?: number;

  @ApiProperty({ description: 'RPE (1-10)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  rpe?: number;

  @ApiProperty({ description: '是否完成', required: false })
  @IsOptional()
  completed?: boolean;
}

export class UpdateWorkoutExerciseDto {
  @ApiProperty({ description: '動作名稱', required: false })
  @IsOptional()
  @IsString()
  exerciseName?: string;

  @ApiProperty({ description: '身體部位', enum: BodyPart, required: false })
  @IsOptional()
  @IsEnum(BodyPart)
  bodyPart?: BodyPart;

  @ApiProperty({ description: '動作 ID', required: false })
  @IsOptional()
  @IsMongoId()
  exerciseId?: string;

  @ApiProperty({ type: [UpdateWorkoutSetDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateWorkoutSetDto)
  sets?: UpdateWorkoutSetDto[];
}

// 重訓更新 DTO
export class UpdateResistanceDataDto {
  @ApiProperty({ type: [UpdateWorkoutExerciseDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateWorkoutExerciseDto)
  exercises?: UpdateWorkoutExerciseDto[];

  @ApiProperty({ description: '總休息秒數', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalRestSeconds?: number;
}

// 有氧運動更新 DTO
export class UpdateCardioDataDto {
  @ApiProperty({ description: '有氧運動類型', enum: CardioType, required: false })
  @IsOptional()
  @IsEnum(CardioType)
  cardioType?: CardioType;

  @ApiProperty({ description: '距離（公里）', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  distance?: number;

  @ApiProperty({ description: '強度等級（1-10）', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  intensity?: number;

  @ApiProperty({ description: '平均心率', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  averageHeartRate?: number;

  @ApiProperty({ description: '最大心率', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxHeartRate?: number;

  @ApiProperty({ description: '消耗卡路里（估算）', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  caloriesBurned?: number;

  @ApiProperty({ description: '運動地點', required: false })
  @IsOptional()
  @IsString()
  location?: string;
}

// 柔韌性運動更新 DTO
export class UpdateFlexibilityDataDto {
  @ApiProperty({ description: '體式或動作名稱', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  poses?: string[];

  @ApiProperty({ description: '難度等級（1-10）', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  difficulty?: number;

  @ApiProperty({ description: '重點部位', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusAreas?: string[];

  @ApiProperty({ description: '放鬆程度（1-10）', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  relaxationLevel?: number;
}

export class UpdateWorkoutRecordDto {
  @ApiProperty({ description: '日期', example: '2024-01-15', required: false })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ description: '運動類型', enum: WorkoutType, required: false })
  @IsOptional()
  @IsEnum(WorkoutType)
  type?: WorkoutType;

  @ApiProperty({ description: '運動持續時間（分鐘）', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiProperty({ description: '備註', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  // 各運動類型專用數據
  @ApiProperty({ description: '重訓數據', type: UpdateResistanceDataDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateResistanceDataDto)
  resistanceData?: UpdateResistanceDataDto;

  @ApiProperty({ description: '有氧數據', type: UpdateCardioDataDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCardioDataDto)
  cardioData?: UpdateCardioDataDto;

  @ApiProperty({ description: '柔韌性數據', type: UpdateFlexibilityDataDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateFlexibilityDataDto)
  flexibilityData?: UpdateFlexibilityDataDto;

  // 向後兼容的舊欄位（標記為 deprecated）
  @ApiProperty({ type: [UpdateWorkoutExerciseDto], required: false, deprecated: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateWorkoutExerciseDto)
  exercises?: UpdateWorkoutExerciseDto[];

  @ApiProperty({ description: '本次訓練總時長（秒）', required: false, deprecated: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  workoutDurationSeconds?: number;

  @ApiProperty({ description: '總休息秒數', required: false, deprecated: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalRestSeconds?: number;
}


