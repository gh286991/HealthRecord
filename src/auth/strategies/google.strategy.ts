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
    const displayName = profile.displayName || email || `google_${profile.id}`;
    const avatar = profile.photos?.[0]?.value;

    // Find existing user by email if present
    let user = email
      ? await this.userModel.findOne({ email })
      : await this.userModel.findOne({ username: `google_${profile.id}` });

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
        email: email || `${username}@example.com`,
        password: randomPassword,
        name: displayName,
        avatar,
        provider: 'google',
        providerId: profile.id,
      });
      await user.save();
      isNew = true;
    } else {
      // Ensure provider info is recorded (idempotent)
      const shouldUpdate = !user.provider || !user.providerId || user.avatar !== avatar || user.name !== displayName;
      if (shouldUpdate) {
        user.provider = user.provider || 'google';
        user.providerId = user.providerId || profile.id;
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
