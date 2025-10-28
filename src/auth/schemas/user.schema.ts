import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as bcrypt from 'bcrypt';

export type UserDocument = User & Document;

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum ActivityLevel {
  SEDENTARY = 'sedentary', // 久坐：很少或沒有運動
  LIGHTLY_ACTIVE = 'lightly_active', // 輕度活躍：每週輕度運動/體育活動 1-3 天
  MODERATELY_ACTIVE = 'moderately_active', // 中度活躍：每週中度運動/體育活動 3-5 天
  VERY_ACTIVE = 'very_active', // 非常活躍：每週高強度運動/體育活動 6-7 天
  EXTRA_ACTIVE = 'extra_active', // 極度活躍：非常高強度運動/體育活動 & 從事體力勞動或每天訓練兩次
}

export enum Goal {
  WEIGHT_LOSS = 'weight_loss', // 減重
  MAINTAIN = 'maintain', // 維持
  MUSCLE_GAIN = 'muscle_gain', // 增肌
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, trim: true })
  username: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  password: string;

  // 使用者名稱
  @Prop({ required: false, trim: true })
  name: string;

  // 使用者頭像
  @Prop({ required: false, trim: true })
  avatar: string;

  // 使用者介紹
  @Prop({ required: false, trim: true })
  bio: string;

  // 使用者性別
  @Prop({ required: false, trim: true, enum: Gender })
  gender: Gender;

  // 使用者生日
  @Prop({ required: false, trim: true, type: Date })
  birthday: string;

  // 使用者身高 (公分)
  @Prop({ required: false, type: Number })
  height?: number;

  // 使用者體重 (公斤)
  @Prop({ required: false, type: Number })
  weight?: number;

  // 使用者活動量
  @Prop({ required: false, trim: true, enum: ActivityLevel })
  activityLevel?: ActivityLevel;

  // 使用者目標
  @Prop({ required: false, trim: true, enum: Goal, default: Goal.MAINTAIN })
  goal?: Goal;

  // AI 分析計數
  @Prop({ type: Number, default: 0 })
  aiAnalysisCount: number;

  // 最後 AI 分析日期
  @Prop({ type: Date, default: null })
  lastAiAnalysisDate: Date;

  // 偏好：是否顯示付款方式欄位（飲食記錄）
  @Prop({ type: Boolean, default: false })
  showPaymentMethod?: boolean;

  // OAuth provider (e.g., 'google')
  @Prop({ required: false, trim: true })
  provider?: string;

  // OAuth provider unique id
  @Prop({ required: false, trim: true })
  providerId?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    const orderedRet = {
      userId: ret._id,
      username: ret.username,
      email: ret.email,
      name: ret.name,
      avatar: ret.avatar,
      bio: ret.bio,
      gender: ret.gender,
      birthday: ret.birthday,
      height: ret.height,
      weight: ret.weight,
      activityLevel: ret.activityLevel,
      goal: ret.goal,
      showPaymentMethod: ret.showPaymentMethod,
      createdAt: ret.createdAt,
      updatedAt: ret.updatedAt,
    };

    Object.keys(orderedRet).forEach((key) => {
      if (orderedRet[key] === undefined) {
        delete orderedRet[key];
      }
    });

    return orderedRet;
  },
});

UserSchema.set('toObject', {
  transform: (doc, ret) => {
    const orderedRet = {
      userId: ret._id,
      username: ret.username,
      email: ret.email,
      name: ret.name,
      avatar: ret.avatar,
      bio: ret.bio,
      gender: ret.gender,
      birthday: ret.birthday,
      height: ret.height,
      weight: ret.weight,
      activityLevel: ret.activityLevel,
      goal: ret.goal,
      showPaymentMethod: ret.showPaymentMethod,
      createdAt: ret.createdAt,
      updatedAt: ret.updatedAt,
    };

    Object.keys(orderedRet).forEach((key) => {
      if (orderedRet[key] === undefined) {
        delete orderedRet[key];
      }
    });

    return orderedRet;
  },
});

UserSchema.pre<UserDocument>('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});
