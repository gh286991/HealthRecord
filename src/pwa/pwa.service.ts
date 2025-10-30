import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserPwaStatus, UserPwaStatusDocument, PwaEvent } from './schemas/user-pwa-status.schema';

@Injectable()
export class PwaService {
  constructor(
    @InjectModel(UserPwaStatus.name)
    private readonly pwaModel: Model<UserPwaStatusDocument>,
  ) {}

  async getStatus(userId: Types.ObjectId | string) {
    const id = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    const doc = await this.pwaModel.findOne({ userId: id });
    const installed = !!doc?.installedAt;
    const nextPromptAt = doc?.nextPromptAt ?? null;
    return { installed, nextPromptAt };
  }

  async recordEvent(userId: Types.ObjectId | string, event: PwaEvent) {
    const id = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    const now = new Date();
    const update: Partial<UserPwaStatus> = {
      lastAction: event,
      lastActionAt: now,
    };

    if (event === 'later') {
      const next = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      update.nextPromptAt = next;
      // increment laterCount
      await this.pwaModel.updateOne(
        { userId: id },
        {
          $set: update,
          $inc: { laterCount: 1 },
          $setOnInsert: { dismissCount: 0 },
        },
        { upsert: true },
      );
    } else if (event === 'install') {
      update.installedAt = now;
      update.nextPromptAt = null;
      await this.pwaModel.updateOne(
        { userId: id },
        {
          $set: update,
          $setOnInsert: { laterCount: 0, dismissCount: 0 },
        },
        { upsert: true },
      );
    } else if (event === 'dismiss') {
      await this.pwaModel.updateOne(
        { userId: id },
        {
          $set: update,
          $inc: { dismissCount: 1 },
          $setOnInsert: { laterCount: 0 },
        },
        { upsert: true },
      );
    }

    return this.getStatus(id);
  }

  async getSummary() {
    const [installedCount, laterAgg, dismissAgg, totalCount] = await Promise.all([
      this.pwaModel.countDocuments({ installedAt: { $ne: null } }),
      this.pwaModel.aggregate([
        { $group: { _id: null, total: { $sum: '$laterCount' } } },
      ]),
      this.pwaModel.aggregate([
        { $group: { _id: null, total: { $sum: '$dismissCount' } } },
      ]),
      this.pwaModel.estimatedDocumentCount(),
    ]);

    const laterCount = laterAgg[0]?.total ?? 0;
    const dismissCount = dismissAgg[0]?.total ?? 0;
    const installRate = totalCount > 0 ? installedCount / totalCount : 0;
    return { installedCount, totalUsersTracked: totalCount, laterCount, dismissCount, installRate };
  }
}


