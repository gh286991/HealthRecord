
import { ApiProperty } from '@nestjs/swagger';
import { DietRecord } from '../../diet/schemas/diet-record.schema';
import { WorkoutRecord } from '../../workout/schemas/workout-record.schema';
import { WorkoutPlan } from '../../workout/schemas/workout-plan.schema';

class DailyTotals {
  @ApiProperty()
  totalCalories: number;
  @ApiProperty()
  totalProtein: number;
  @ApiProperty()
  totalCarbohydrates: number;
  @ApiProperty()
  totalFat: number;
}

class DietSummary {
  @ApiProperty({ type: [DietRecord] })
  records: DietRecord[];

  @ApiProperty({ type: DailyTotals })
  dailyTotals: DailyTotals;
}

export class DashboardDto {
  @ApiProperty({
    description: 'Calculated Total Daily Energy Expenditure (TDEE)',
    example: 2500,
  })
  tdee: number;

  @ApiProperty({
    description: 'Calculated Basal Metabolic Rate (BMR)',
    example: 1500,
  })
  bmr: number;

  @ApiProperty({
    description: "User's activity level string",
    example: 'lightly_active',
  })
  activityLevel: string;

  @ApiProperty({
    description: 'Multiplier used for TDEE calculation based on activity level',
    example: 1.375,
  })
  activityMultiplier: number;

  @ApiProperty({
    description: 'Summary of diet records for the day',
    type: DietSummary,
  })
  dietSummary: DietSummary;

  @ApiProperty({
    description: 'Workout records for the day',
    type: [WorkoutRecord],
  })
  workoutRecords: WorkoutRecord[];

  @ApiProperty({
    description: 'Workout plans for the day',
    type: [WorkoutPlan],
  })
  workoutPlans: WorkoutPlan[];
}
