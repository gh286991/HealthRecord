import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkoutService } from './workout.service';
import { WorkoutController } from './workout.controller';
import { WorkoutRecord, WorkoutRecordSchema } from './schemas/workout-record.schema';
import { Exercise, ExerciseSchema } from './schemas/exercise.schema';
import { UserExercise, UserExerciseSchema } from './schemas/user-exercise.schema';
import { WorkoutPlan, WorkoutPlanSchema } from './schemas/workout-plan.schema';
import { ExerciseSeedService } from './exercise-seed.service';
import { WorkoutPlanController } from './workout-plan.controller';
import { User, UserSchema } from '../auth/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkoutRecord.name, schema: WorkoutRecordSchema },
      { name: Exercise.name, schema: ExerciseSchema },
      { name: UserExercise.name, schema: UserExerciseSchema },
      { name: WorkoutPlan.name, schema: WorkoutPlanSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [WorkoutController, WorkoutPlanController],
  providers: [WorkoutService, ExerciseSeedService],
  exports: [WorkoutService],
})
export class WorkoutModule {}

