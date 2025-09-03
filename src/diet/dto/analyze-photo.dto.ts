import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';

export class AnalyzePhotoDto {
  @ApiProperty({
    description: '要分析的餐點照片的公開網址',
    example: 'https://storage.googleapis.com/bucket-name/image.webp',
  })
  @IsUrl({}, { message: '提供的 photoUrl 必須是有效的網址' })
  photoUrl: string;
}