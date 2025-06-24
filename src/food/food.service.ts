import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Food, FoodDocument } from './schemas/food.schema';
import { CreateFoodDto } from './dto/create-food.dto';

@Injectable()
export class FoodService {
  constructor(@InjectModel(Food.name) private foodModel: Model<FoodDocument>) {}

  async create(createFoodDto: CreateFoodDto): Promise<Food> {
    const createdFood = new this.foodModel(createFoodDto);
    return createdFood.save();
  }

  async findAll(query?: {
    category?: string;
    isActive?: boolean;
  }): Promise<Food[]> {
    const filter: any = {};

    if (query?.category) {
      filter.category = query.category;
    }

    if (query?.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    return this.foodModel.find(filter).sort({ name: 1 }).exec();
  }

  async findOne(id: string): Promise<Food> {
    const food = await this.foodModel.findById(id).exec();
    if (!food) {
      throw new NotFoundException(`找不到 ID 為 ${id} 的食物`);
    }
    return food;
  }

  async findByName(name: string): Promise<Food | null> {
    return this.foodModel.findOne({ name }).exec();
  }

  async update(
    id: string,
    updateFoodDto: Partial<CreateFoodDto>,
  ): Promise<Food> {
    const updatedFood = await this.foodModel
      .findByIdAndUpdate(id, updateFoodDto, { new: true })
      .exec();

    if (!updatedFood) {
      throw new NotFoundException(`找不到 ID 為 ${id} 的食物`);
    }

    return updatedFood;
  }

  async remove(id: string): Promise<void> {
    const result = await this.foodModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`找不到 ID 為 ${id} 的食物`);
    }
  }

  async getCategories(): Promise<string[]> {
    const categories = await this.foodModel.distinct('category').exec();
    return categories.filter((category) => category && category.trim() !== '');
  }
}
