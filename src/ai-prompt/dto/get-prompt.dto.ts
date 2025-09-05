import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GetPromptDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  version?: string;
}
