import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { AuthGuard } from '@nestjs/passport';
import { LoginDto } from './dto/login.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('認證管理')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: '用戶註冊' })
  @ApiResponse({ status: 201, description: '註冊成功' })
  @ApiResponse({ status: 400, description: '註冊失敗，資料格式錯誤' })
  @ApiResponse({ status: 409, description: '用戶名或信箱已存在' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(AuthGuard('local'))
  @Post('login')
  @ApiOperation({ summary: '用戶登入' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: '登入成功，返回 JWT token' })
  @ApiResponse({ status: 401, description: '用戶名或密碼錯誤' })
  async login(@Body() loginDto: LoginDto, @Request() req) {
    // loginDto is used by the guard for validation but not explicitly in the handler
    return this.authService.login(req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '獲取用戶資料' })
  @ApiResponse({ status: 200, description: '成功獲取用戶資料' })
  @ApiResponse({ status: 401, description: '未授權，需要有效的 JWT token' })
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '更新用戶資料' })
  @ApiResponse({ status: 200, description: '用戶資料更新成功' })
  @ApiResponse({ status: 401, description: '未授權，需要有效的 JWT token' })
  @ApiResponse({ status: 400, description: '更新失敗，資料格式錯誤' })
  updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    return this.authService.updateProfile(
      req.user.userId || req.user.sub,
      updateUserDto,
    );
  }
}
