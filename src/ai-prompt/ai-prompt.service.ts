
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
    
    // Sort using semver for robustness, but handle invalid versions
    const sorted = prompts.sort((a, b) => {
      try {
        return semver.rcompare(a.version, b.version);
      } catch (error) {
        // If semver comparison fails, fall back to string comparison
        return b.version.localeCompare(a.version);
      }
    });
    
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
      const newPrompt = new this.aiPromptModel({ 
        name, 
        text, 
        version: '1.0.0' 
      });
      this.logger.log(`Created first version of prompt '${name}' (v1.0.0)`);
      const savedPrompt = await newPrompt.save();
      return savedPrompt;
    }

    // Check if text is identical to the latest version
    if (latestPrompt.text === text) {
      this.logger.log(`Prompt text for '${name}' is identical to latest version (v${latestPrompt.version}). No update needed.`);
      return latestPrompt;
    }

    // Increment version and create new prompt
    const newVersion = semver.inc(latestPrompt.version, 'patch');
    const newPrompt = new this.aiPromptModel({ 
      name, 
      text, 
      version: newVersion 
    });
    this.logger.log(`Creating new version of prompt '${name}': v${latestPrompt.version} -> v${newVersion}`);
    const savedPrompt = await newPrompt.save();
    return savedPrompt;
  }

  async getAllPrompts(): Promise<AiPromptDocument[]> {
    // 獲取所有提示詞的最新版本
    const allPrompts = await this.aiPromptModel.find().sort({ name: 1, version: -1 }).exec();
    
    // 按名稱分組，只保留每個名稱的最新版本
    const latestPrompts = new Map<string, AiPromptDocument>();
    
    for (const prompt of allPrompts) {
      if (!latestPrompts.has(prompt.name)) {
        latestPrompts.set(prompt.name, prompt);
      }
    }
    
    return Array.from(latestPrompts.values());
  }

  async getPromptVersions(name: string): Promise<AiPromptDocument[]> {
    return this.aiPromptModel.find({ name }).sort({ version: -1 }).exec();
  }
}
