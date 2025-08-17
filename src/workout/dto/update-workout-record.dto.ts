import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsMongoId, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

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
}

export class UpdateWorkoutExerciseDto {
  @ApiProperty({ description: '動作名稱', required: false })
  @IsOptional()
  @IsString()
  exerciseName?: string;

  @ApiProperty({ description: '身體部位', required: false })
  @IsOptional()
  @IsString()
  bodyPart?: string;

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

export class UpdateWorkoutRecordDto {
  @ApiProperty({ description: '日期', example: '2024-01-15', required: false })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ type: [UpdateWorkoutExerciseDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateWorkoutExerciseDto)
  exercises?: UpdateWorkoutExerciseDto[];

  @ApiProperty({ description: '備註', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: '本次訓練總時長（秒）', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  workoutDurationSeconds?: number;

  @ApiProperty({ description: '總休息秒數（由各組 restSeconds 加總）', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalRestSeconds?: number;
}


