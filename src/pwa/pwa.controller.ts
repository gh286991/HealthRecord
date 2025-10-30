import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PwaService } from './pwa.service';
import { PwaEvent } from './schemas/user-pwa-status.schema';

@ApiTags('PWA')
@ApiBearerAuth()
@Controller('pwa')
@UseGuards(JwtAuthGuard)
export class PwaController {
  constructor(private readonly pwaService: PwaService) {}

  @Get('status')
  @ApiOperation({ summary: '取得使用者的 PWA 提示狀態' })
  async getStatus(@Request() req) {
    const userId = req.user.userId;
    return this.pwaService.getStatus(userId);
  }

  @Post('event')
  @ApiOperation({ summary: '回報 PWA 提示事件（install/later/dismiss）' })
  async postEvent(@Request() req, @Body() body: { event: PwaEvent }) {
    const userId = req.user.userId;
    const { event } = body || { event: 'dismiss' };
    return this.pwaService.recordEvent(userId, event);
  }

  @Get('summary')
  @ApiOperation({ summary: 'PWA 提示使用統計（安裝數、later/dismiss 計數、安裝率）' })
  async getSummary() {
    return this.pwaService.getSummary();
  }
}


