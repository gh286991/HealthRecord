import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FoodDocument = Food & Document;

@Schema({ timestamps: true })
export class Food {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  calories: number;

  @Prop({ required: true })
  protein: number; // 蛋白質 (g)

  @Prop({ required: true })
  carbohydrates: number; // 碳水化合物 (g)

  @Prop({ required: true })
  fat: number; // 脂肪 (g)

  @Prop()
  fiber: number; // 纖維 (g)

  @Prop()
  sugar: number; // 糖分 (g)

  @Prop()
  sodium: number; // 鈉 (mg)

  @Prop()
  servingSize: string; // 份量描述，如 "100g", "1個蘋果"

  @Prop({ default: '一般' })
  category: string; // 食物分類，如 "蔬菜", "水果", "肉類", "穀物"

  @Prop({ default: true })
  isActive: boolean; // 是否啟用

  @Prop({ default: '' })
  photoUrl: string; // 食物照片網址
}

export const FoodSchema = SchemaFactory.createForClass(Food);
