import { Module, Global } from '@nestjs/common';
import { MinioService } from './services/minio.service';

@Global()
@Module({
  providers: [MinioService],
  exports: [MinioService],
})
export class CommonModule {}
