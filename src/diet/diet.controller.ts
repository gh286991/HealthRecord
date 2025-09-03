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
import { CreateDietRecordDto } from './dto/create-diet-record.dto';
import { UpdateDietRecordDto } from './dto/update-diet-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { MinioService } from '../common/services/minio.service';
import { Logger } from '@nestjs/common';
// 動態載入 sharp，避免在不同模組系統下的相容性問題
let sharpLib: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  sharpLib = require('sharp');
} catch {}

@ApiTags('飲食紀錄')
@Controller('diet-records')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DietController {
  constructor(
    private readonly dietService: DietService,
    private readonly minioService: MinioService,
  ) {}
  private readonly logger = new Logger(DietController.name);

  @Post('analyze-photo')
  @UseInterceptors(FileInterceptor('file'))
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
  @ApiOperation({ summary: '傳入圖片以分析食物營養' })
  async analyzePhoto(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.dietService.analyzePhoto(file, req.user.userId);
  }

  @Post()
  @ApiOperation({ summary: '建立飲食紀錄' })
  create(@Request() req, @Body() createDietRecordDto: CreateDietRecordDto) {
    return this.dietService.create(req.user.userId, createDietRecordDto);
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

  @Get('marked-dates/:year/:month')
  @ApiOperation({ summary: '取得有飲食記錄的日期' })
  getMarkedDates(
    @Request() req,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.dietService.getMarkedDates(req.user.userId, parseInt(year), parseInt(month));
  }

  @Post('migrate-nutrition-fields')
  @ApiOperation({ summary: '遷移營養字段（僅限開發環境）' })
  migrateNutritionFields() {
    // 僅在開發環境允許執行
    if (process.env.NODE_ENV === 'production') {
      throw new Error('此操作僅限開發環境');
    }
    return this.dietService.migrateNutritionFields();
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
    // 先嘗試轉為 WebP，失敗則回退原圖
    let bufferToUpload = file.buffer;
    let contentType = 'image/webp';
    // 成功轉檔時強制使用 .webp 檔名
    let targetFileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}.webp`;
    try {
      if (sharpLib) {
        const converted = await sharpLib(file.buffer)
          .rotate() // 修正 EXIF 方向
          .webp({ quality: 80 })
          .toBuffer();
        bufferToUpload = converted;
        this.logger.log(
          `Convert to webp success: orig=${file.mimetype}(${file.size}) => webp(${bufferToUpload.length}), name=${targetFileName}`,
        );
      } else {
        throw new Error('sharp not available');
      }
    } catch (e) {
      // 回退：使用原始檔
      bufferToUpload = file.buffer;
      contentType = file.mimetype;
      targetFileName = this.minioService.generateUniqueFileName(file.originalname);
      this.logger.warn(
        `Convert to webp failed, fallback original: reason=${(e as Error).message}, name=${targetFileName}, type=${contentType}`,
      );
    }

    const photoUrl = await this.minioService.uploadFile(
      targetFileName,
      bufferToUpload,
      contentType,
      'diet-records',
    );

    await this.dietService.update(req.user.userId, id, { photoUrl });

    return { photoUrl };
  }
}
