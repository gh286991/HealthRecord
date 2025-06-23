import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '../schemas/user.schema';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: '姓名',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: '頭像 URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({
    description: '個人簡介',
    example: '喜歡運動和健康生活',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    description: '性別',
    enum: Gender,
    example: Gender.MALE,
  })
  @IsOptional()
  @IsEnum(Gender, {
    message: 'Gender must be other, male, or female',
  })
  gender?: Gender;

  @ApiPropertyOptional({
    description: '生日',
    example: '1990-01-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Birthday must be a valid date' })
  birthday?: string;
}
