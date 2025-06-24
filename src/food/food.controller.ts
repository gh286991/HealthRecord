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
import { FoodService } from './food.service';
import { CreateFoodDto } from './dto/create-food.dto';
import { UpdateFoodDto } from './dto/update-food.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { MinioService } from '../common/services/minio.service';

@ApiTags('食物管理')
@Controller('foods')
export class FoodController {
  constructor(
    private readonly foodService: FoodService,
    private readonly minioService: MinioService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '建立食物' })
  create(@Body() createFoodDto: CreateFoodDto) {
    return this.foodService.create(createFoodDto);
  }

  @Get()
  @ApiOperation({ summary: '取得所有食物' })
  findAll(
    @Query('category') category?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.foodService.findAll({ category, isActive });
  }

  @Get('categories')
  @ApiOperation({ summary: '取得所有食物分類' })
  getCategories() {
    return this.foodService.getCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: '根據 ID 取得食物' })
  findOne(@Param('id') id: string) {
    return this.foodService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '更新食物' })
  update(@Param('id') id: string, @Body() updateFoodDto: UpdateFoodDto) {
    return this.foodService.update(id, updateFoodDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '刪除食物' })
  remove(@Param('id') id: string) {
    return this.foodService.remove(id);
  }

  @Post(':id/photo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\//)) {
          return cb(new Error('只允許上傳圖片檔案'), false);
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
  @ApiOperation({ summary: '上傳食物照片' })
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
      'foods',
    );

    await this.foodService.update(id, { photoUrl });

    return { photoUrl };
  }
}
