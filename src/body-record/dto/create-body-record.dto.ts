
import { IsNotEmpty, IsNumber, IsOptional, IsDateString, IsObject } from 'class-validator';

export class CreateBodyRecordDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsNumber()
  @IsNotEmpty()
  weight: number;

  @IsNumber()
  @IsOptional()
  bodyFat?: number;

  @IsObject()
  @IsOptional()
  inbody?: Record<string, any>;
}
