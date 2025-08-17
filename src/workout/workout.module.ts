import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkoutService } from './workout.service';
import { WorkoutController } from './workout.controller';
import { WorkoutRecord, WorkoutRecordSchema } from './schemas/workout-record.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkoutRecord.name, schema: WorkoutRecordSchema },
    ]),
  ],
  controllers: [WorkoutController],
  providers: [WorkoutService],
  exports: [WorkoutService],
})
export class WorkoutModule {}


