import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DietService } from './diet.service';
import { DietController } from './diet.controller';
import { DietRecord, DietRecordSchema } from './schemas/diet-record.schema';
import { FoodModule } from '../food/food.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DietRecord.name, schema: DietRecordSchema },
    ]),
    FoodModule,
  ],
  controllers: [DietController],
  providers: [DietService],
  exports: [DietService],
})
export class DietModule {}
