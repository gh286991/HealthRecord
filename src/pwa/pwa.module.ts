import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PwaController } from './pwa.controller';
import { PwaService } from './pwa.service';
import { UserPwaStatus, UserPwaStatusSchema } from './schemas/user-pwa-status.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserPwaStatus.name, schema: UserPwaStatusSchema },
    ]),
  ],
  controllers: [PwaController],
  providers: [PwaService],
})
export class PwaModule {}


