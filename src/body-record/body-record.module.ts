
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BodyRecord, BodyRecordSchema } from './schemas/body-record.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { BodyRecordService } from './body-record.service';
import { BodyRecordController } from './body-record.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BodyRecord.name, schema: BodyRecordSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [BodyRecordController],
  providers: [BodyRecordService],
})
export class BodyRecordModule {}
