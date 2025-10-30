import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TermsDoc, TermsDocSchema } from './schemas/terms-doc.schema';
import { UserAgreement, UserAgreementSchema } from './schemas/user-agreement.schema';
import { LegalService } from './legal.service';
import { LegalBootstrap } from './legal.bootstrap';
import { LegalController } from './legal.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TermsDoc.name, schema: TermsDocSchema },
      { name: UserAgreement.name, schema: UserAgreementSchema },
    ]),
  ],
  controllers: [LegalController],
  providers: [LegalService, LegalBootstrap],
  exports: [MongooseModule, LegalService],
})
export class LegalModule {}
