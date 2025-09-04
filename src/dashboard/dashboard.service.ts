import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, Gender, ActivityLevel } from '../auth/schemas/user.schema';
import { DietService } from '../diet/diet.service';
import { WorkoutService } from '../workout/workout.service';
import { DashboardDto } from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  private activityLevelMultiplier: Record<ActivityLevel, number> = {
    [ActivityLevel.SEDENTARY]: 1.2,
    [ActivityLevel.LIGHTLY_ACTIVE]: 1.375,
    [ActivityLevel.MODERATELY_ACTIVE]: 1.55,
    [ActivityLevel.VERY_ACTIVE]: 1.725,
    [ActivityLevel.EXTRA_ACTIVE]: 1.9,
  };

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly dietService: DietService,
    private readonly workoutService: WorkoutService,
  ) {}

  async getDashboardData(userId: string): Promise<DashboardDto> {
    const today = new Date().toISOString().split('T')[0];
    const user = await this.userModel.findById(userId).lean();

    if (!user) {
      this.logger.warn(`User with ID ${userId} not found.`);
      return null;
    }

    const calculation = this.calculateTDEE(user);

    const [dietSummary, workoutRecords, workoutPlans] = await Promise.all([
      this.dietService.getDailySummary(userId, today),
      this.workoutService.findAll(userId, today),
      this.workoutService.getWorkoutPlans(userId, today),
    ]);

    return {
      tdee: calculation.tdee,
      bmr: calculation.bmr,
      activityLevel: user.activityLevel,
      activityMultiplier: calculation.multiplier,
      dietSummary,
      workoutRecords,
      workoutPlans,
    };
  }

  private calculateTDEE(user: User): { tdee: number; bmr: number; multiplier: number } {
    const { gender, birthday, height, weight, activityLevel } = user;

    if (!gender || !birthday || !height || !weight || !activityLevel) {
      return { tdee: 0, bmr: 0, multiplier: 0 };
    }

    const age = this.calculateAge(new Date(birthday));

    // Validate that all inputs for BMR are valid numbers
    if (isNaN(age) || isNaN(height) || isNaN(weight)) {
        this.logger.warn(`Invalid data for TDEE calculation for user. Age: ${age}, Height: ${height}, Weight: ${weight}`);
        return { tdee: 0, bmr: 0, multiplier: 0 };
    }

    // Mifflin-St Jeor Equation for BMR
    let bmr: number;
    if (gender === Gender.MALE) {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else if (gender === Gender.FEMALE) {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    } else {
      // For 'other', use an average of the male and female offsets.
      bmr = 10 * weight + 6.25 * height - 5 * age - 78;
    }

    if (isNaN(bmr)) {
        this.logger.error(`BMR calculation resulted in NaN for user.`);
        return { tdee: 0, bmr: 0, multiplier: 0 };
    }

    const multiplier = this.activityLevelMultiplier[activityLevel] || 1.2;
    const tdee = bmr * multiplier;

    return { tdee: Math.round(tdee), bmr: Math.round(bmr), multiplier };
  }

  private calculateAge(birthday: Date): number {
    if (isNaN(birthday.getTime())) {
        return NaN;
    }
    const ageDifMs = Date.now() - birthday.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }
}