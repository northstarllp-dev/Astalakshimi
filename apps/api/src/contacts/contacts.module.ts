import { Module } from '@nestjs/common';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { DatabaseModule } from '../database/database.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [DatabaseModule, EntitlementsModule, PaymentsModule],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule {}
