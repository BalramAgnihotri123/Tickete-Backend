import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { CronModule } from 'src/cron/cron.module';

@Module({
  imports: [CronModule],
  providers: [AdminService],
  controllers: [AdminController]
})
export class AdminModule {}
