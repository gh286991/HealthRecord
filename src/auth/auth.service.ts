import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { TermsDoc, TermsDocDocument } from '../legal/schemas/terms-doc.schema';
import { UserAgreement, UserAgreementDocument } from '../legal/schemas/user-agreement.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(TermsDoc.name) private termsDocModel: Model<TermsDocDocument>,
    @InjectModel(UserAgreement.name) private userAgreementModel: Model<UserAgreementDocument>,
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

    // 記錄用戶同意服務條款和隱私權政策的時間（向後相容欄位）
    const now = new Date();
    const user = new this.userModel({ 
      username, 
      password, 
      email,
      termsAcceptedAt: now,
      privacyAcceptedAt: now,
    });
    await user.save();

    // 同意紀錄改由前端明確呼叫 /agreements，並在後端以 IP + UA 紀錄（避免缺少 IP）

    return { message: 'User registered successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).select('-password');
    return user;
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto) {
    // 使用白名單方式，只允許特定欄位被更新
    const allowedFields = ['name', 'avatar', 'bio', 'gender', 'birthday', 'height', 'weight', 'activityLevel', 'goal', 'showPaymentMethod'];
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

  createLinkToken(payload: { userId: string; provider: string; providerId: string; email?: string }) {
    // 短期有效的連結用 token，區分用途
    return this.jwtService.sign({
      typ: 'link',
      sub: payload.userId,
      provider: payload.provider,
      providerId: payload.providerId,
      email: payload.email,
    }, { expiresIn: '15m' });
  }

  async linkOAuth(linkToken: string) {
    try {
      const decoded: any = this.jwtService.verify(linkToken);
      if (decoded?.typ !== 'link') throw new Error('Invalid token type');
      const user = await this.userModel.findById(decoded.sub);
      if (!user) throw new Error('User not found');
      // 若其他帳號已經綁了此 providerId，避免衝突
      const exists = await this.userModel.findOne({ provider: decoded.provider, providerId: decoded.providerId, _id: { $ne: user._id } });
      if (exists) throw new Error('Provider already linked to another account');
      // 寫入 provider 綁定
      user.provider = user.provider || decoded.provider;
      user.providerId = user.providerId || decoded.providerId;
      // 若使用者 email 未設定或大小寫不同，更新為 token 內 email（小寫）
      if (decoded.email) {
        const lower = String(decoded.email).toLowerCase();
        if (!user.email || user.email.toLowerCase() !== lower) user.email = lower as any;
      }
      await user.save();
      // 回傳正式 accessToken
      const { accessToken } = await this.login(user);
      return { accessToken };
    } catch (e) {
      throw new ConflictException('Link token invalid or expired');
    }
  }
}
