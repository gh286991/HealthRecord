import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { Gender } from '../schemas/user.schema';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsEnum(Gender, {
    message: 'Gender must be other, male, or female',
  })
  gender?: Gender;

  @IsOptional()
  @IsDateString({}, { message: 'Birthday must be a valid date' })
  birthday?: string;
}
