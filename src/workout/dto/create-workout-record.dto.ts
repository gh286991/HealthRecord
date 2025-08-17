import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

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
  @Min(1)
  restSeconds?: number;

  @ApiProperty({ description: 'RPE (1-10)', required: false, example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  rpe?: number;
}

export class CreateWorkoutExerciseDto {
  @ApiProperty({ description: '動作名稱（由系統維護）', example: '臥推 (Bench Press)' })
  @IsString()
  @IsNotEmpty()
  exerciseName: string;

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
}


