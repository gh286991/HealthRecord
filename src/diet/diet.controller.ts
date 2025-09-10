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
  UploadedFiles,
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
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { MinioService } from '../common/services/minio.service';
import { Logger } from '@nestjs/common';
import { AnalyzePhotoDto } from './dto/analyze-photo.dto';

// 動態載入 sharp，避免在不同模組系統下的相容性問題
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharpLib = require('sharp');

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
  @ApiOperation({ summary: '傳入圖片 URL 以分析食物營養' })
  async analyzePhoto(@Request() req, @Body() analyzePhotoDto: AnalyzePhotoDto) {
    return this.dietService.analyzePhoto(analyzePhotoDto, req.user.userId);
  }

  @Post()
  @ApiOperation({ summary: '建立飲食紀錄' })
  create(@Request() req, @Body() createDietRecordDto: CreateDietRecordDto) {
    return this.dietService.create(req.user.userId, createDietRecordDto);
  }

  @Post('draft')
  @ApiOperation({ summary: '建立草稿飲食紀錄（用於圖片上傳）' })
  createDraft(@Request() req, @Body() createDietRecordDto: CreateDietRecordDto) {
    return this.dietService.createDraft(req.user.userId, createDietRecordDto);
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

  @Post(':id/photos') // Changed from photo to photos
  @UseInterceptors(
    FilesInterceptor('files', 10, { // Changed to FilesInterceptor, allowing up to 10 files
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
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { // Changed from file to files
          type: 'array', // Changed to array
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiOperation({ summary: '上傳多張飲食紀錄照片' })
  async uploadPhotos(
    @Request() req,
    @Param('id') id: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    const photoUrls = [];
    for (const file of files) {
      let bufferToUpload = file.buffer;
      let contentType = 'image/webp';
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
      photoUrls.push(photoUrl);
    }

    // When uploading multiple photos, we overwrite existing ones.
    await this.dietService.update(req.user.userId, id, { photoUrls });

    return { photoUrls };
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
  @ApiOperation({ summary: '上傳單張飲食紀錄照片 (舊版相容)' })
  async uploadPhoto(
    @Request() req,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    let bufferToUpload = file.buffer;
    let contentType = 'image/webp';
    let targetFileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}.webp`;

    try {
      if (sharpLib) {
        const converted = await sharpLib(file.buffer)
          .rotate()
          .webp({ quality: 80 })
          .toBuffer();
        bufferToUpload = converted;
      } else {
        throw new Error('sharp not available');
      }
    } catch (e) {
      bufferToUpload = file.buffer;
      contentType = file.mimetype;
      targetFileName = this.minioService.generateUniqueFileName(file.originalname);
    }

    const photoUrl = await this.minioService.uploadFile(
      targetFileName,
      bufferToUpload,
      contentType,
      'diet-records',
    );

    // For single upload, we add to the existing list of photos.
    const record = await this.dietService.findOne(req.user.userId, id);
    const existingUrls = record.photoUrls || [];
    if (record.photoUrl && !existingUrls.includes(record.photoUrl)) {
        existingUrls.unshift(record.photoUrl);
    }
    const photoUrls = [...existingUrls, photoUrl];

    await this.dietService.update(req.user.userId, id, { photoUrls });

    return { photoUrls };
  }
}
