import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DietRecordDocument = DietRecord & Document;

@Schema({ _id: false })
export class FoodItem {
  @Prop({ required: true })
  foodName: string; // 使用者自行輸入的食物名稱

  @Prop({ required: false })
  description?: string; // 食物描述（如：一碗白飯、一個蘋果）

  @Prop({ required: false, default: 0 })
  calories: number; // 估計卡路里

  @Prop({ required: false, default: 0 })
  protein: number; // 估計蛋白質(g)

  @Prop({ required: false, default: 0 })
  carbohydrates: number; // 估計碳水化合物(g)

  @Prop({ required: false, default: 0 })
  fat: number; // 估計脂肪(g)

  @Prop({ required: false, default: 0 })
  fiber?: number; // 估計纖維(g)

  @Prop({ required: false, default: 0 })
  sugar?: number; // 估計糖分(g)

  @Prop({ required: false, default: 0 })
  sodium?: number; // 估計鈉含量(mg)
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

  @Prop({ type: Number, required: false, min: 0 })
  price?: number; // 價錢

  @Prop({ required: false, enum: ['cash', 'card', 'mobile', 'other'] })
  paymentMethod?: 'cash' | 'card' | 'mobile' | 'other';

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

  @Prop({ type: [String], default: [] })
  photoUrls: string[]; // 餐點照片網址

  @Prop({ type: String, required: false }) // For backward compatibility
  photoUrl: string; 

  @Prop({ default: false })
  isDraft: boolean; // 是否為草稿狀態
}

export const DietRecordSchema = SchemaFactory.createForClass(DietRecord);

// 建立複合索引，提高查詢效率（移除unique限制，允許同一餐次多筆記錄）
DietRecordSchema.index({ userId: 1, date: 1, mealType: 1 });
