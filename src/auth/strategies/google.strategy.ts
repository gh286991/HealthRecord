import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Strategy, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from '../schemas/user.schema';
import * as crypto from 'crypto';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<any> {
    const email = profile.emails?.[0]?.value;
    const normalizedEmail = email ? email.toLowerCase() : undefined;
    const displayName = profile.displayName || email || `google_${profile.id}`;
    const avatar = profile.photos?.[0]?.value;

    // 先以 email（不分大小寫）尋找，確保先走 "確認綁定" 流程
    let user: any = null;
    if (normalizedEmail) {
      const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      user = await this.userModel.findOne({ email: { $regex: new RegExp(`^${escape(normalizedEmail)}$`, 'i') } });
      if (user) {
        // 已有同信箱帳號
        if (user.provider === 'google' && user.providerId) {
          // 已綁定 → 直接登入（後面做 idempotent 更新）
        } else {
          // 未綁定 → 要求前端確認綁定
          const { password, ...result } = user.toObject();
          return { ...result, __needsLink: true, __providerId: profile.id, __provider: 'google' };
        }
      }
    }
    if (!user) {
      // 若 email 沒命中，再以 providerId 尋找既有綁定
      user = await this.userModel.findOne({ provider: 'google', providerId: profile.id });
    }
    if (!user) {
      // 最後退回以 google_<id> 使用者名稱尋找
      user = await this.userModel.findOne({ username: `google_${profile.id}` });
    }

    let isNew = false;
    if (!user) {
      // Ensure unique username; prefer email, fallback to google_<id>
      const usernameCandidate = email || `google_${profile.id}`;
      let username = usernameCandidate;
      const exists = await this.userModel.exists({ username });
      if (exists) {
        // Append short hash to avoid collision
        const suffix = crypto.createHash('md5').update(profile.id).digest('hex').slice(0, 6);
        username = `${usernameCandidate}_${suffix}`;
      }

      const randomPassword = crypto.randomBytes(24).toString('hex');
      user = new this.userModel({
        username,
        email: normalizedEmail || `${username}@example.com`,
        password: randomPassword,
        name: displayName,
        avatar,
        provider: 'google',
        providerId: profile.id,
      });
      await user.save();
      isNew = true;
    } else {
      // 如果找到相同信箱的帳號，但尚未綁定 Google，先回前端請使用者確認是否要綁定
      if (user.provider !== 'google' || !user.providerId) {
        const { password, ...result } = user.toObject();
        return { ...result, __needsLink: true, __providerId: profile.id, __provider: 'google' };
      }

      // 已有綁定 → 做 idempotent 更新頭像/名稱
      const shouldUpdate = user.avatar !== avatar || user.name !== displayName;
      if (shouldUpdate) {
        if (avatar) user.avatar = avatar;
        if (displayName) user.name = displayName;
        await user.save();
      }
    }

    // Return a safe user object; JwtStrategy will serialize it
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user.toObject();
    return { ...result, __isNew: isNew };
  }
}
