
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { DietModule } from '../diet/diet.module';
import { WorkoutModule } from '../workout/workout.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    DietModule,
    WorkoutModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
