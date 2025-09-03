
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AiLog, AiLogDocument } from './schemas/ai-log.schema';
import { Types } from 'mongoose';

// Using an interface for DTO shape for simplicity within the same module
export interface CreateAiLogDto {
  userId: string | Types.ObjectId;
  model: string;
  promptId: string | Types.ObjectId;
  apiResponse?: string;
  parsedResponse?: any;
  inputTokens?: number;
  outputTokens?: number;
  imageUrl?: string;
  status: 'success' | 'error';
  errorMessage?: string;
}

@Injectable()
export class AiLoggingService {
  private readonly logger = new Logger(AiLoggingService.name);

  constructor(
    @InjectModel(AiLog.name) private aiLogModel: Model<AiLogDocument>,
  ) {}

  async createLog(dto: CreateAiLogDto): Promise<void> {
    try {
      const logData = {
        ...dto,
        userId: new Types.ObjectId(dto.userId),
        promptId: new Types.ObjectId(dto.promptId),
      };
      await this.aiLogModel.create(logData);
    } catch (error) {
      this.logger.error(`Failed to create AI log: ${error.message}`, error.stack);
      // We don't rethrow the error because logging failure should not crash the main operation.
    }
  }
}
