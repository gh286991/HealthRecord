
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BodyRecord, BodyRecordDocument } from './schemas/body-record.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { CreateBodyRecordDto } from './dto/create-body-record.dto';

@Injectable()
export class BodyRecordService {
  constructor(
    @InjectModel(BodyRecord.name) private bodyRecordModel: Model<BodyRecordDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(userId: string, createBodyRecordDto: CreateBodyRecordDto): Promise<BodyRecord> {
    const createdRecord = new this.bodyRecordModel({
      ...createBodyRecordDto,
      user: userId,
    });

    await this.userModel.findByIdAndUpdate(userId, { weight: createBodyRecordDto.weight });

    return createdRecord.save();
  }

  async findAllForUser(userId: string): Promise<BodyRecord[]> {
    return this.bodyRecordModel.find({ user: userId }).sort({ date: -1 }).exec();
  }

  async findOne(id: string, userId: string): Promise<BodyRecord> {
    return this.bodyRecordModel.findOne({ _id: id, user: userId }).exec();
  }

  async delete(id: string, userId: string): Promise<any> {
    // After deleting a record, we should update the user's weight to the latest one.
    const recordToDelete = await this.findOne(id, userId);
    if (!recordToDelete) {
      return null;
    }

    const result = await this.bodyRecordModel.deleteOne({ _id: id, user: userId }).exec();

    const latestRecord = await this.bodyRecordModel.findOne({ user: userId }).sort({ date: -1 }).exec();

    await this.userModel.findByIdAndUpdate(userId, { weight: latestRecord ? latestRecord.weight : null });

    return result;
  }
}
