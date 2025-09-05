import { IsString, IsNotEmpty, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdatePromptDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(10000)
  text: string;

  @IsOptional()
  @IsString()
  description?: string;
}
