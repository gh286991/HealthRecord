import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as bcrypt from 'bcrypt';

export type UserDocument = User & Document;

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, trim: true })
  username: string;

  @Prop({ required: true, unique: true, trim: true })
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

  // AI 分析計數
  @Prop({ type: Number, default: 0 })
  aiAnalysisCount: number;

  // 最後 AI 分析日期
  @Prop({ type: Date, default: null })
  lastAiAnalysisDate: Date;
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
