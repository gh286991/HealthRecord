
import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiPrompt, AiPromptSchema } from './schemas/ai-prompt.schema';
import { AiPromptService } from './ai-prompt.service';
import { AiPromptController } from './ai-prompt.controller';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: AiPrompt.name, schema: AiPromptSchema }]),
  ],
  providers: [AiPromptService],
  exports: [AiPromptService],
  controllers: [AiPromptController],
})
export class AiPromptModule {}
