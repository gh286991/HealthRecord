
import { Controller, Post, Body, UseGuards, Request, Get, Param, Delete } from '@nestjs/common';
import { BodyRecordService } from './body-record.service';
import { CreateBodyRecordDto } from './dto/create-body-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('body-record')
export class BodyRecordController {
  constructor(private readonly bodyRecordService: BodyRecordService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req, @Body() createBodyRecordDto: CreateBodyRecordDto) {
    return this.bodyRecordService.create(req.user.userId, createBodyRecordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Request() req) {
    return this.bodyRecordService.findAllForUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.bodyRecordService.delete(id, req.user.userId);
  }
}
