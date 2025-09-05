import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateFoodItemDto {
  @ApiProperty({ description: '食物名稱', example: '白米飯' })
  @IsString()
  @IsNotEmpty()
  foodName: string;

  @ApiProperty({ description: '食物描述', example: '一碗白米飯', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '卡路里', example: 150, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: '卡路里不能小於 0' })
  calories?: number;

  @ApiProperty({ description: '蛋白質(g)', example: 3.5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: '蛋白質不能小於 0' })
  protein?: number;

  @ApiProperty({ description: '碳水化合物(g)', example: 30, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: '碳水化合物不能小於 0' })
  carbohydrates?: number;

  @ApiProperty({ description: '脂肪(g)', example: 0.5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: '脂肪不能小於 0' })
  fat?: number;

  @ApiProperty({ description: '纖維(g)', example: 1.0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: '纖維不能小於 0' })
  fiber?: number;

  @ApiProperty({ description: '糖分(g)', example: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: '糖分不能小於 0' })
  sugar?: number;

  @ApiProperty({ description: '鈉含量(mg)', example: 5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: '鈉含量不能小於 0' })
  sodium?: number;
}

export class UpdateDietRecordDto {
  @ApiProperty({ description: '日期', example: '2024-01-15', required: false })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({
    description: '餐次類型',
    enum: ['早餐', '午餐', '晚餐', '點心'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['早餐', '午餐', '晚餐', '點心'])
  mealType?: string;

  @ApiProperty({
    description: '食物項目列表',
    type: [UpdateFoodItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateFoodItemDto)
  foods?: UpdateFoodItemDto[];

  @ApiProperty({ description: '備註', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: '餐點照片網址', required: false })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiProperty({ description: '是否為草稿狀態', required: false })
  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;
}
