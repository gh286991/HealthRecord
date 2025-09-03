
import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { AiPromptService } from './ai-prompt.service';
import { AuthGuard } from '@nestjs/passport'; // Assuming you have role guards

// DTO for seeding a prompt
class SeedPromptDto {
  name: string;
  text: string;
}

@Controller('ai-prompt')
export class AiPromptController {
  private readonly logger = new Logger(AiPromptController.name);

  constructor(private readonly aiPromptService: AiPromptService) {}

  // This endpoint is for administrators to add or update prompts.
  // You should protect it with a role-based guard.
  @Post('seed')
  // @UseGuards(AuthGuard('jwt'), RolesGuard) // Example of protection
  // @Roles('admin')
  async seedPrompt(@Body() body: SeedPromptDto) {
    this.logger.log(`Seeding prompt with name: ${body.name}`);
    if (!body.name || !body.text) {
      return { success: false, message: 'name and text are required.' };
    }
    const prompt = await this.aiPromptService.createOrUpdatePrompt(body.name, body.text);
    return {
      success: true,
      message: `Prompt '${prompt.name}' seeded. Version is now '${prompt.version}'.`,
      prompt,
    };
  }
}
