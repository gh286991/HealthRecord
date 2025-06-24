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

export class UpdateFoodItemDto {
  @ApiProperty({ description: '食物 ID' })
  @IsMongoId()
  @IsNotEmpty()
  foodId: string;

  @ApiProperty({ description: '份量倍數', example: 1.5 })
  @IsNumber()
  @Min(0.1)
  quantity: number;
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
}
