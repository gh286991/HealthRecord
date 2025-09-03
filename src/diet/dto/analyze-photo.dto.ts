import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl } from 'class-validator';

export class AnalyzePhotoDto {
  @ApiProperty({
    description: '已上傳圖片的 URL',
    example: 'https://your-minio-server.com/bucket/image.jpg',
  })
  @IsString()
  @IsUrl({}, { message: 'imageUrl 必須是有效的 URL' })
  imageUrl: string;
}
