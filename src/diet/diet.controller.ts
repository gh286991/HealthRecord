import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { DietService } from './diet.service';
import {
  CreateDietRecordDto,
  CreateDietRecordWithPhotoDto,
} from './dto/create-diet-record.dto';
import { UpdateDietRecordDto } from './dto/update-diet-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { MinioService } from '../common/services/minio.service';

@ApiTags('飲食紀錄')
@Controller('diet-records')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DietController {
  constructor(
    private readonly dietService: DietService,
    private readonly minioService: MinioService,
  ) {}

  @Post()
  @ApiOperation({ summary: '建立飲食紀錄' })
  create(@Request() req, @Body() createDietRecordDto: CreateDietRecordDto) {
    return this.dietService.create(req.user.userId, createDietRecordDto);
  }

  @Post('with-photo')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
        ];

        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new Error('只允許上傳 JPG、JPEG、PNG、GIF、WebP 格式的圖片檔案'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        date: {
          type: 'string',
          format: 'date',
          description: '日期',
          example: '2024-01-15',
        },
        mealType: {
          type: 'string',
          enum: ['早餐', '午餐', '晚餐', '點心'],
          description: '餐次類型',
        },
        foods: {
          type: 'string',
          description: '食物項目列表 (JSON 字串)',
          example: '[{"foodId":"507f1f77bcf86cd799439011","quantity":1.5}]',
        },
        notes: {
          type: 'string',
          description: '備註',
        },
      },
      required: ['date', 'mealType'],
    },
  })
  @ApiOperation({ summary: '建立飲食紀錄（包含照片上傳）' })
  async createWithPhoto(
    @Request() req,
    @Body() body: CreateDietRecordWithPhotoDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // 從 multipart/form-data 解析資料
    const createDietRecordDto: CreateDietRecordDto = {
      date: body.date,
      mealType: body.mealType,
      foods: body.foods ? JSON.parse(body.foods) : undefined,
      notes: body.notes,
    };

    return this.dietService.createWithPhoto(
      req.user.userId,
      createDietRecordDto,
      file,
    );
  }

  @Get()
  @ApiOperation({ summary: '取得用戶的飲食紀錄' })
  findAll(@Request() req, @Query('date') date?: string) {
    return this.dietService.findAll(req.user.userId, date);
  }

  @Get('daily-summary')
  @ApiOperation({ summary: '取得每日飲食摘要' })
  getDailySummary(@Request() req, @Query('date') date: string) {
    return this.dietService.getDailySummary(req.user.userId, date);
  }

  @Get(':id')
  @ApiOperation({ summary: '根據 ID 取得飲食紀錄' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.dietService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新飲食紀錄' })
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDietRecordDto: UpdateDietRecordDto,
  ) {
    return this.dietService.update(req.user.userId, id, updateDietRecordDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '刪除飲食紀錄' })
  remove(@Request() req, @Param('id') id: string) {
    return this.dietService.remove(req.user.userId, id);
  }

  @Post(':id/photo')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
        ];

        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new Error('只允許上傳 JPG、JPEG、PNG、GIF、WebP 格式的圖片檔案'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: '上傳飲食紀錄照片' })
  async uploadPhoto(
    @Request() req,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const fileName = this.minioService.generateUniqueFileName(
      file.originalname,
    );

    const photoUrl = await this.minioService.uploadFile(
      fileName,
      file.buffer,
      file.mimetype,
      'diet-records',
    );

    await this.dietService.update(req.user.userId, id, { photoUrl });

    return { photoUrl };
  }
}
