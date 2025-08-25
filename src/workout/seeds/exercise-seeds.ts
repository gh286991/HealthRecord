import { BodyPart } from '../schemas/workout-record.schema';

export const exerciseSeeds: Array<{ name: string; bodyPart: BodyPart }> = [
  // 胸部
  { name: 'Bench Press', bodyPart: BodyPart.Chest },
  { name: 'Incline Dumbbell Press', bodyPart: BodyPart.Chest },
  { name: 'Dumbbell Flyes', bodyPart: BodyPart.Chest },
  { name: 'Push-ups', bodyPart: BodyPart.Chest },

  // 腿部
  { name: 'Squat', bodyPart: BodyPart.Legs },
  { name: 'Romanian Deadlift', bodyPart: BodyPart.Legs },
  { name: 'Hip Thrust', bodyPart: BodyPart.Legs },
  { name: 'Lunges', bodyPart: BodyPart.Legs },
  { name: 'Leg Press', bodyPart: BodyPart.Legs },
  { name: 'Calf Raises', bodyPart: BodyPart.Legs },

  // 背部
  { name: 'Deadlift', bodyPart: BodyPart.Back },
  { name: 'Barbell Row', bodyPart: BodyPart.Back },
  { name: 'Pull-up', bodyPart: BodyPart.Back },
  { name: 'Lat Pulldown', bodyPart: BodyPart.Back },
  { name: 'T-Bar Row', bodyPart: BodyPart.Back },

  // 肩部
  { name: 'Overhead Press', bodyPart: BodyPart.Shoulders },
  { name: 'Lateral Raise', bodyPart: BodyPart.Shoulders },
  { name: 'Rear Delt Flyes', bodyPart: BodyPart.Shoulders },
  { name: 'Front Raise', bodyPart: BodyPart.Shoulders },
  { name: 'Shrugs', bodyPart: BodyPart.Shoulders },

  // 手臂
  { name: 'Biceps Curl', bodyPart: BodyPart.Arms },
  { name: 'Hammer Curl', bodyPart: BodyPart.Arms },
  { name: 'Preacher Curl', bodyPart: BodyPart.Arms },
  { name: 'Triceps Pushdown', bodyPart: BodyPart.Arms },
  { name: 'Overhead Triceps Extension', bodyPart: BodyPart.Arms },
  { name: 'Close-Grip Bench Press', bodyPart: BodyPart.Arms },
  { name: 'Dips', bodyPart: BodyPart.Arms },

  // 核心
  { name: 'Plank', bodyPart: BodyPart.Core },
  { name: 'Crunches', bodyPart: BodyPart.Core },
  { name: 'Russian Twists', bodyPart: BodyPart.Core },
  { name: 'Leg Raises', bodyPart: BodyPart.Core },
  { name: 'Mountain Climbers', bodyPart: BodyPart.Core },

  // 全身
  { name: 'Burpees', bodyPart: BodyPart.FullBody },
  { name: 'Thrusters', bodyPart: BodyPart.FullBody },
  { name: 'Clean and Press', bodyPart: BodyPart.FullBody },
];