
import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiLoggingService } from './ai-logging.service';
import { AiLog, AiLogSchema } from './schemas/ai-log.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: AiLog.name, schema: AiLogSchema }]),
  ],
  providers: [AiLoggingService],
  exports: [AiLoggingService],
})
export class AiLoggingModule {}
