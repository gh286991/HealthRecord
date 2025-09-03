
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AiPrompt, AiPromptDocument } from './schemas/ai-prompt.schema';
import * as semver from 'semver';

@Injectable()
export class AiPromptService {
  private readonly logger = new Logger(AiPromptService.name);

  constructor(
    @InjectModel(AiPrompt.name) private aiPromptModel: Model<AiPromptDocument>,
  ) {}

  async getPrompt(name: string, version?: string): Promise<AiPromptDocument> {
    if (version) {
      return this.getPromptByVersion(name, version);
    }
    return this.getLatestPrompt(name);
  }

  async getLatestPrompt(name: string): Promise<AiPromptDocument> {
    const prompts = await this.aiPromptModel.find({ name }).sort({ version: -1 }).exec();
    if (!prompts || prompts.length === 0) {
      throw new NotFoundException(`找不到名稱為 '${name}' 的 AI 提示詞。`);
    }
    
    // Sort using semver for robustness
    const sorted = prompts.sort((a, b) => semver.rcompare(a.version, b.version));
    
    return sorted[0];
  }

  async getPromptByVersion(name: string, version: string): Promise<AiPromptDocument> {
    const prompt = await this.aiPromptModel.findOne({ name, version }).exec();
    if (!prompt) {
      throw new NotFoundException(`找不到名稱為 '${name}' 且版本為 '${version}' 的 AI 提示詞。`);
    }
    return prompt;
  }

  async createOrUpdatePrompt(name: string, text: string): Promise<AiPromptDocument> {
    const latestPrompt = await this.getLatestPrompt(name).catch(() => null);

    if (!latestPrompt) {
      // Create first version
      const newPrompt = new this.aiPromptModel({ name, text, version: '1.0' });
      this.logger.log(`Created first version of prompt '${name}' (v1.0)`);
      return newPrompt.save();
    }

    // Check if text is identical to the latest version
    if (latestPrompt.text === text) {
      this.logger.log(`Prompt text for '${name}' is identical to latest version (v${latestPrompt.version}). No update needed.`);
      return latestPrompt;
    }

    // Increment version and create new prompt
    const newVersion = semver.inc(latestPrompt.version, 'patch');
    const newPrompt = new this.aiPromptModel({ name, text, version: newVersion });
    this.logger.log(`Creating new version of prompt '${name}': v${latestPrompt.version} -> v${newVersion}`);
    return newPrompt.save();
  }
}
