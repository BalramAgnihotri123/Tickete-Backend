import { Controller, Logger } from "@nestjs/common";

@Controller('cron')
export class CronController {
  private readonly logger = new Logger(CronController.name);
  constructor() {} 
}
