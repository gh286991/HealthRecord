import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { FoodModule } from './food/food.module';
import { DietModule } from './diet/diet.module';
import { WorkoutModule } from './workout/workout.module';
import { CommonModule } from './common/common.module';
import { AiLoggingModule } from './ai-logging/ai-logging.module';
import { AiPromptModule } from './ai-prompt/ai-prompt.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BodyRecordModule } from './body-record/body-record.module';
import { LegalModule } from './legal/legal.module';
import { PwaModule } from './pwa/pwa.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME,
    }),
    CommonModule,
    AuthModule,
    FoodModule,
    DietModule,
    WorkoutModule,
    AiLoggingModule,
    AiPromptModule,
    DashboardModule,
    BodyRecordModule,
    LegalModule,
    PwaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
