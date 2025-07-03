import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DietRecordDocument = DietRecord & Document;

@Schema({ _id: false })
export class FoodItem {
  @Prop({ type: Types.ObjectId, ref: 'Food', required: true })
  foodId: Types.ObjectId;

  @Prop({ required: true })
  foodName: string;

  @Prop({ required: true, min: 0.1 })
  quantity: number; // 份量倍數，如 1.5 表示 1.5 份

  @Prop({ required: true })
  calories: number;

  @Prop({ required: true })
  protein: number;

  @Prop({ required: true })
  carbohydrates: number;

  @Prop({ required: true })
  fat: number;

  @Prop()
  fiber?: number;

  @Prop()
  sugar?: number;

  @Prop()
  sodium?: number;
}

@Schema({ timestamps: true })
export class DietRecord {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Date })
  date: Date; // 日期，只保留年月日

  @Prop({ required: true, enum: ['早餐', '午餐', '晚餐', '點心'] })
  mealType: string; // 餐次類型

  @Prop({ type: [FoodItem], default: [] })
  foods: FoodItem[];

  @Prop()
  notes?: string; // 備註

  @Prop({ default: 0 })
  totalCalories: number;

  @Prop({ default: 0 })
  totalProtein: number;

  @Prop({ default: 0 })
  totalCarbohydrates: number;

  @Prop({ default: 0 })
  totalFat: number;

  @Prop({ default: 0 })
  totalFiber: number;

  @Prop({ default: 0 })
  totalSugar: number;

  @Prop({ default: 0 })
  totalSodium: number;

  @Prop({ default: '' })
  photoUrl: string; // 餐點照片網址
}

export const DietRecordSchema = SchemaFactory.createForClass(DietRecord);

// 建立複合索引，方便查詢同一用戶在同一天同一餐次的紀錄
DietRecordSchema.index({ userId: 1, date: 1, mealType: 1 });
