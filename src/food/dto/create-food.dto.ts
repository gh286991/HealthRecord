import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateFoodDto {
  @ApiProperty({ description: '食物名稱' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '熱量 (卡路里)' })
  @IsNumber()
  @Min(0)
  calories: number;

  @ApiProperty({ description: '蛋白質 (g)' })
  @IsNumber()
  @Min(0)
  protein: number;

  @ApiProperty({ description: '碳水化合物 (g)' })
  @IsNumber()
  @Min(0)
  carbohydrates: number;

  @ApiProperty({ description: '脂肪 (g)' })
  @IsNumber()
  @Min(0)
  fat: number;

  @ApiProperty({ description: '纖維 (g)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fiber?: number;

  @ApiProperty({ description: '糖分 (g)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sugar?: number;

  @ApiProperty({ description: '鈉 (mg)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sodium?: number;

  @ApiProperty({ description: '份量描述', example: '100g', required: false })
  @IsOptional()
  @IsString()
  servingSize?: string;

  @ApiProperty({ description: '食物分類', example: '蔬菜', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: '是否啟用', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: '食物照片網址', required: false })
  @IsOptional()
  @IsString()
  photoUrl?: string;
}
