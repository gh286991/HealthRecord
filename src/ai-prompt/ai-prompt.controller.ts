
import { Controller, Post, Get, Body, Param, UseGuards, Logger, ValidationPipe, HttpException, HttpStatus } from '@nestjs/common';
import { AiPromptService } from './ai-prompt.service';
import { AuthGuard } from '@nestjs/passport';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import { GetPromptDto } from './dto/get-prompt.dto';

@Controller('ai-prompt')
export class AiPromptController {
  private readonly logger = new Logger(AiPromptController.name);

  constructor(private readonly aiPromptService: AiPromptService) {}

  /**
   * 更新或創建 AI 提示詞
   * POST /ai-prompt/update
   */
  @Post('update')
  // @UseGuards(AuthGuard('jwt'), RolesGuard) // 建議加上身份驗證
  // @Roles('admin')
  async updatePrompt(@Body(ValidationPipe) updatePromptDto: UpdatePromptDto) {
    try {
      this.logger.log(`Updating prompt with name: ${updatePromptDto.name}`);
      
      const prompt = await this.aiPromptService.createOrUpdatePrompt(
        updatePromptDto.name, 
        updatePromptDto.text
      );
      
      return {
        success: true,
        message: `AI 提示詞 '${prompt.name}' 已更新。當前版本: v${prompt.version}`,
        data: {
          name: prompt.name,
          version: prompt.version,
          text: prompt.text,
          updatedAt: (prompt as any).updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(`Error updating prompt: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: '更新 AI 提示詞時發生錯誤',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 獲取 AI 提示詞（最新版本）
   * GET /ai-prompt/:name
   */
  @Get(':name')
  async getPrompt(@Param('name') name: string) {
    try {
      const prompt = await this.aiPromptService.getLatestPrompt(name);
      return {
        success: true,
        data: {
          name: prompt.name,
          version: prompt.version,
          text: prompt.text,
          createdAt: (prompt as any).createdAt,
          updatedAt: (prompt as any).updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting prompt: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * 獲取指定版本的 AI 提示詞
   * GET /ai-prompt/:name/:version
   */
  @Get(':name/:version')
  async getPromptByVersion(@Param('name') name: string, @Param('version') version: string) {
    try {
      const prompt = await this.aiPromptService.getPromptByVersion(name, version);
      return {
        success: true,
        data: {
          name: prompt.name,
          version: prompt.version,
          text: prompt.text,
          createdAt: (prompt as any).createdAt,
          updatedAt: (prompt as any).updatedAt,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting prompt by version: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * 獲取所有 AI 提示詞列表
   * GET /ai-prompt
   */
  @Get()
  async getAllPrompts() {
    try {
      // 這裡需要添加一個獲取所有提示詞的方法到 service
      const prompts = await this.aiPromptService.getAllPrompts();
      return {
        success: true,
        data: prompts,
      };
    } catch (error) {
      this.logger.error(`Error getting all prompts: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: '獲取 AI 提示詞列表時發生錯誤',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
