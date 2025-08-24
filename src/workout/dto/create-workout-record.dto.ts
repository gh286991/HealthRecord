import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { BodyPart } from '../schemas/workout-record.schema';

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

export class CreateWorkoutRecordDto {
  @ApiProperty({ description: '日期', example: '2024-01-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ type: [CreateWorkoutExerciseDto], required: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkoutExerciseDto)
  exercises: CreateWorkoutExerciseDto[];

  @ApiProperty({ description: '備註', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: '本次訓練總時長（秒）', required: false, example: 3600 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  workoutDurationSeconds?: number;

  @ApiProperty({ description: '總休息秒數（由各組 restSeconds 加總）', required: false, example: 600 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalRestSeconds?: number;
}


