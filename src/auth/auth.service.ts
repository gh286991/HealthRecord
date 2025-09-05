import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const { username, password, email } = registerDto;

    const existingUser = await this.userModel.findOne({
      $or: [{ username }, { email }],
    });
    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    const user = new this.userModel({ username, password, email });
    await user.save();

    return { message: 'User registered successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).select('-password');
    return user;
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto) {
    // 使用白名單方式，只允許特定欄位被更新
    const allowedFields = ['name', 'avatar', 'bio', 'gender', 'birthday', 'height', 'weight', 'activityLevel', 'goal'];
    const allowedUpdates: any = {};

    allowedFields.forEach((field) => {
      if (updateUserDto[field] !== undefined) {
        allowedUpdates[field] = updateUserDto[field];
      }
    });

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, allowedUpdates, { new: true })
      .select('-password');
    return updatedUser;
  }

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.userModel.findOne({ username });
    if (user && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async login(user: any): Promise<{ accessToken: string }> {
    const payload = { username: user.username, sub: user.userId || user._id };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
