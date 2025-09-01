import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { BodyPart } from '../schemas/workout-plan.schema';

// This DTO is based on the structure from create-workout-record.dto.ts for consistency

export class CreateWorkoutSetDto {
  @ApiProperty({ description: '重量(kg)', example: 60 })
  @IsNumber()
  @Min(0)
  weight: number;

  @ApiProperty({ description: '次數', example: 12 })
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
}

export class CreateWorkoutExerciseDto {
  @ApiProperty({ description: '動作名稱', example: '臥推 (Bench Press)' })
  @IsString()
  @IsNotEmpty()
  exerciseName: string;

  @ApiProperty({ description: '身體部位', enum: BodyPart, example: BodyPart.Chest })
  @IsOptional()
  @IsEnum(BodyPart)
  bodyPart?: BodyPart;

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

export class CreateWorkoutPlanDto {
  @ApiProperty({ description: '課表名稱', example: '週一胸肌日' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '計畫執行的日期', example: '2024-10-28' })
  @IsDateString()
  plannedDate: string;

  @ApiProperty({ description: '指派給的使用者ID (可選，若為空則指派給自己)', required: false })
  @IsOptional()
  @IsMongoId()
  assignedTo?: string;

  @ApiProperty({ type: [CreateWorkoutExerciseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkoutExerciseDto)
  exercises: CreateWorkoutExerciseDto[];
}
