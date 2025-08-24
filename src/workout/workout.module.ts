import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkoutService } from './workout.service';
import { WorkoutController } from './workout.controller';
import { WorkoutRecord, WorkoutRecordSchema } from './schemas/workout-record.schema';
import { Exercise, ExerciseSchema } from './schemas/exercise.schema';
import { UserExercise, UserExerciseSchema } from './schemas/user-exercise.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkoutRecord.name, schema: WorkoutRecordSchema },
      { name: Exercise.name, schema: ExerciseSchema },
      { name: UserExercise.name, schema: UserExerciseSchema },
    ]),
  ],
  controllers: [WorkoutController],
  providers: [WorkoutService],
  exports: [WorkoutService],
})
export class WorkoutModule {}


