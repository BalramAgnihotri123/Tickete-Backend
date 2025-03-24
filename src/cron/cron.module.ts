//* Services 
import { CronService } from './cron.service';

//* Modules
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ProductsModule } from 'src/products/products.module';
import { CronController } from './cron.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ProductsModule,
  ],
  providers: [CronService],
  controllers: [CronController],
  exports: [CronService],
})
export class CronModule {}
