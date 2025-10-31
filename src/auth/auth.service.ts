import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { TermsDoc, TermsDocDocument } from '../legal/schemas/terms-doc.schema';
import { UserAgreement, UserAgreementDocument } from '../legal/schemas/user-agreement.schema';
import { EmailService } from '../common/services/email.service';
import { renderVerifyEmail } from '../common/email-templates/verify-email';
import { renderWelcomeEmail } from '../common/email-templates/welcome';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(TermsDoc.name) private termsDocModel: Model<TermsDocDocument>,
    @InjectModel(UserAgreement.name) private userAgreementModel: Model<UserAgreementDocument>,
    private jwtService: JwtService,
    private emailService: EmailService,
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

  // Email-based registration: Step 1
  async registerEmailStart(email?: string) {
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3030';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ConflictException('Invalid email');
    }
    const existing = await this.userModel.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    if (existing) throw new ConflictException('Email already registered');
    const token = this.jwtService.sign({ typ: 'reg', email: String(email).toLowerCase() }, { expiresIn: '15m' });
    const link = `${FRONTEND_URL.replace(/\/$/, '')}/register/verify?token=${encodeURIComponent(token)}`;
    const echo = String(process.env.EMAIL_DEV_ECHO || 'true') === 'true';
    const send = String(process.env.EMAIL_SEND || 'true') === 'true';
    if (send) {
      try {
        // MailerModule + Handlebars template
        await this.emailService.sendTemplate({
          to: email,
          subject: `${process.env.BRAND_NAME || 'YoungFit 漾飛特'}｜請驗證您的 Email` ,
          template: 'verify',
          context: { brand: process.env.BRAND_NAME || 'YoungFit 漾飛特', link },
        });
      } catch (e) {
        this.logger?.warn?.(`send register email failed: ${String(e)}`);
      }
    }
    return { ok: true, ...(echo ? { link } : {}) };
  }

  // Step 2: Verify token validity
  async registerEmailVerify(token?: string) {
    try {
      const decoded: any = this.jwtService.verify(token || '');
      if (decoded?.typ !== 'reg') throw new Error('Invalid type');
      return { ok: true, email: decoded.email };
    } catch {
      throw new ConflictException('Token invalid or expired');
    }
  }

  // Step 3: Complete registration
  async registerEmailComplete(params: { token?: string; username: string; password: string; name?: string; bio?: string; gender?: string; birthday?: string; height?: number; weight?: number; activityLevel?: string; goal?: string; showPaymentMethod?: boolean }) {
    try {
      const decoded: any = this.jwtService.verify(params?.token || '');
      if (decoded?.typ !== 'reg') throw new Error('Invalid type');
      const email = String(decoded.email || '').toLowerCase();
      const exists = await this.userModel.findOne({ $or: [ { email: { $regex: new RegExp(`^${email}$`, 'i') } }, { username: params.username } ] });
      if (exists) throw new ConflictException('Username or email already exists');
      const now = new Date();
      const user = new this.userModel({
        username: params.username,
        password: params.password,
        email,
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
      });
      // 附帶的使用者資訊（可選）
      const allowed: (keyof typeof user)[] = [] as any;
      const patch: any = {};
      if (params.name) patch.name = params.name;
      if (params.bio) patch.bio = params.bio;
      if (params.gender && ['male','female','other'].includes(String(params.gender))) patch.gender = params.gender;
      if (params.birthday) patch.birthday = params.birthday;
      if (typeof params.height === 'number') patch.height = params.height;
      if (typeof params.weight === 'number') patch.weight = params.weight;
      if (params.activityLevel && ['sedentary','lightly_active','moderately_active','very_active','extra_active'].includes(String(params.activityLevel))) patch.activityLevel = params.activityLevel;
      if (params.goal && ['weight_loss','maintain','muscle_gain'].includes(String(params.goal))) patch.goal = params.goal;
      if (typeof params.showPaymentMethod === 'boolean') patch.showPaymentMethod = params.showPaymentMethod;
      Object.assign(user, patch);
      await user.save();
      // 發送註冊成功歡迎信（非阻塞）
      try {
        if (String(process.env.EMAIL_SEND || 'true') === 'true') {
          await this.emailService.sendTemplate({
            to: email,
            subject: `${process.env.BRAND_NAME || 'YoungFit 漾飛特'}｜註冊成功，歡迎加入！`,
            template: 'welcome',
            context: {
              username: params.username || '',
              brand: process.env.BRAND_NAME || 'YoungFit 漾飛特',
              dashboard: (process.env.FRONTEND_URL?.replace(/\/$/, '') || 'http://localhost:3030') + '/dashboard',
            },
          });
        }
      } catch (e) {
        this.logger?.warn?.(`send welcome email failed: ${String(e)}`);
      }
      return { ok: true };
    } catch (e) {
      throw new ConflictException('Token invalid or expired');
    }
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
