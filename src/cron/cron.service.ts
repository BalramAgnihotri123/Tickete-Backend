import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval, Timeout } from '@nestjs/schedule';
import Bottleneck from 'bottleneck';
import axios from 'axios';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductsService } from 'src/products/products.service';
import { CronJob, Day } from '@prisma/client';
import { SlotData } from 'src/products/dto/';
import { IPage } from 'src/common/pages.interface';
import { formatDate } from 'src/utils/date.utils';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  constructor(private prisma: PrismaService, private productsService: ProductsService) {}

  // Create a limiter: 30 requests per minute => 1 request per 2000 ms on average.
  private limiter = new Bottleneck({ minTime: 2100 });

  /**
   * Get all cron jobs
   * @returns all cron jobs
   */
  async getAllCrons(page: number, limit: number): Promise<IPage<CronJob[]>> {
    try {
      // get the number of cron jobs
      const totalLength = await this.prisma.cronJob.count();
      const skip = (page - 1) * limit;
      const cronJobs = await this.prisma.cronJob.findMany({
        skip,
        take: limit
      });
      return {data: cronJobs, totalLength, page, limit};
    } catch (error) {
      this.logger.error("Error fetching all cron jobs:", error);
      throw error;
    }
  }

  /**
   * Toggle a cron job ON/OFF
   * @param name - the name of the cron job
   * @param status - the status to set the cron job to
   * @returns the cron job
   * description: Toggle a cron job ON/OFF
   * @example
   * toggleCron("syncNext30Days", true)
   * toggleCron("syncNext30Days", false)
   */
  async toggleCron(name: string, status: boolean) {
    try {
      const cronJob = await this.prisma.cronJob.findUnique({ where: { name } });
      if (!cronJob) return { error: "Invalid cron name" };

      await this.prisma.cronJob.update({
        where: { name },
        data: { isEnabled: status },
      });

      return { message: `Cron ${name} is now ${status ? "enabled" : "disabled"}` };
    } catch (error) {
      this.logger.error("Error toggling cron job:", error);
      return { error: "Error toggling cron job" };
    }
  }

  /**
   * Trigger a cron job manually
   * @param name - the name of the cron job
   * @returns the cron job
   * description: Trigger a cron job manually
   * @example
   * triggerCron("syncNext30Days")
   */
  triggerCron(name: string) {
    switch (name) {
      case "syncNext30Days":
        this.syncNext30Days();
        break;
      case "syncNext7Days":
        this.syncNext7Days();
        break;
      case "syncToday":
        this.syncToday();
        break;
      default:
        return { message: "Invalid cron job name" };
    }
    return { message: `Triggered ${name} successfully` };
  }

  /**
   * Update last execution time
   * @param name - the name of the cron job
   * @returns the cron job
   * description: Update last execution time
   * @example
   * updateExecutionTime("syncNext30Days")
   */
  async updateExecutionTime(name: string) {
    try {
      await this.prisma.cronJob.update({
        where: { name },
        data: { lastExecuted: new Date() },
      });
    } catch (error) {
      this.logger.error("Error updating execution time:", error);
    }
  }

  /**
   * Fetch inventory
   * @param productId - the id of the product
   * @param date - the date to fetch inventory for
   * @returns the inventory
   * description: Fetches inventory from the Tickete API
   */
  private async fetchInventory(productId: number, date: string): Promise<any> {
    const apiKey = process.env.API_KEY;
    const url = `${process.env.TICKETE_API_URL}/inventory/${productId}?date=${date}`;
    this.logger.log({url:url})
    try {
      const response = await axios.get(url, {
        headers: { 'x-api-key': apiKey },
      });
      this.logger.log({response:JSON.stringify(response.data)})
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching inventory for product ${productId} on ${date}`, error);
      return null;
    }
  }

  /**
   * Calculate dates to sync based on product's available days
   * @param availableDays - the available days of the product
   * @param daysSync - the number of days ahead to sync
   * @returns the dates to sync
   * description: Calculates dates to sync based on product's available days
   */
  private getDateDaysToSync(availableDays: Day[], daysToSync: number): Date[] {
    const today = new Date();
    const datesToSync: Date[] = [];
    if (daysToSync === 1) {
      const dayName = today.toLocaleString('en-US', { weekday: 'long' }).toUpperCase();
      if (availableDays.includes(dayName as Day)) {
        datesToSync.push(today);
      }
    } else {
      for (let i = 1; i < daysToSync; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dayName = date.toLocaleString('en-US', { weekday: 'long' }).toUpperCase();
        if (availableDays.includes(dayName as Day)) {
          datesToSync.push(date);
        }
      }
    }
    
    return datesToSync;
  }

  /**
   * Process slots for a specific date
   * @param productId - the id of the product
   * @param date - the date to process slots for
   * @returns the slots
   * description: formats date and processes slots with a limiter for throttling
   */
  private async processDateForProduct(productId: number, date: Date): Promise<void> {
    const formattedDate = formatDate(date.toISOString());
    this.logger.log({ formattedDate });
    
    try {
      const apiResponse = await this.limiter.schedule(() => 
        this.fetchInventory(productId, formattedDate)
      );
      
      if (apiResponse) {
        const slotDataArray = apiResponse as SlotData[];
        
        // * WE CAN USE P-MAP TO PROCESS ALL SLOTS CONCURRENTLY INSTEAD OF SEQUENTIALLY / SEMI PARALLEL
        for (const slotData of slotDataArray) {
          try {
            await this.productsService.processInventorySlot(productId, slotData);
          } catch (err) {
            this.logger.error("Error processing slotData:", err);
          }
        }
      }
    } catch (error) {
      this.logger.error("Error fetching inventory for date", formattedDate, error);
    }
  }

  /**
   * Core sync function that handles both 7 and 30 day syncs
   * @param daysToSync - the number of days ahead to sync
   * @returns the sync
   * description: Core sync function that handles x days syncs
   */
  private async syncInventory(daysToSync: number): Promise<void> {
    try {
      const products = await this.prisma.product.findMany({
        select: { id: true, availableDays: true, timeSlotType: true }
      });

      for (const product of products) {
        const { id: productId, availableDays } = product;
        const datesToSync = this.getDateDaysToSync(availableDays, daysToSync);
        
        // Process all dates in parallel
        await Promise.all(
          datesToSync.map(date => this.processDateForProduct(productId, date))
        );
      }
    } catch (error) {
      this.logger.error(`Error syncing ${daysToSync} days inventory:`, error);
    }
  }

  /**
   * Sync inventory for 30 days
   * @returns the sync
   * description: Sync inventory for 30 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async syncNext30Days(forceTrigger: boolean = false): Promise<void> {
    this.logger.log("Starting 30-day inventory sync job");
    
    try {
      // Check if job should run based on database setting
      if (!forceTrigger) {
        const cronJob = await this.prisma.cronJob.findUnique({ 
          where: { name: "syncNext30Days" } 
        });
        
        if (!cronJob?.isEnabled) {
          this.logger.log("Skipping 30-day sync - job disabled in settings");
          return;
        }
      }
      
      // If we reach here, either forceTrigger is true or the job is enabled
      this.logger.log(`Running 30-day sync (force=${forceTrigger})`);
      await this.syncInventory(30);
      this.logger.log("Completed 30-day inventory sync");
      
    } catch (error) {
      this.logger.error("Error in 30-day inventory sync job", { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  /**
   * Sync inventory for 7 days
   * @returns the sync
   * description: Sync inventory for 7 days
   */
  @Cron(CronExpression.EVERY_4_HOURS)
  async syncNext7Days(forceTrigger: boolean = false): Promise<void> {
    this.logger.log("Starting 7-day inventory sync job");
    
    try {
      // Check if job should run based on database setting
      if (!forceTrigger) {
        const cronJob = await this.prisma.cronJob.findUnique({ 
          where: { name: "syncNext7Days" } 
        });
        
        if (!cronJob?.isEnabled) {
          this.logger.log("Skipping 7-day sync - job disabled in settings");
          return;
        }
      }
      
      // If we reach here, either forceTrigger is true or the job is enabled
      this.logger.log(`Running 7-day sync (force=${forceTrigger})`);
      await this.syncInventory(7);
      this.logger.log("Completed 7-day inventory sync");
      
    } catch (error) {
      this.logger.error("Error in 7-day inventory sync job", { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  /**
   * Sync inventory for 1 day
   * description: Sync inventory for 1 day
   */
  @Cron("*/15 * * * *")
  async syncToday(forceTrigger: boolean = false): Promise<void> {
    this.logger.log("Starting 1-day inventory sync job");
    
    try {
      // Check if job should run based on database setting
      if (!forceTrigger) {
        const cronJob = await this.prisma.cronJob.findUnique({ 
          where: { name: "syncToday" } 
        });
        
        if (!cronJob?.isEnabled) {
          this.logger.log("Skipping 1-day sync - job disabled in settings");
          return;
        }
      }
      
      // If we reach here, either forceTrigger is true or the job is enabled
      this.logger.log(`Running 1-day sync (force=${forceTrigger})`);
      await this.syncInventory(1);
      this.logger.log("Completed 1-day inventory sync");
      
    } catch (error) {
      this.logger.error("Error in 1-day inventory sync job", { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  /**
   * Sync inventory for x days
   * @param daysToSync - the number of days to sync
   * description: Sync inventory for x days
   */
  async syncNextXDays(daysToSync: number): Promise<any> {
    this.logger.log(`Starting ${daysToSync}-day inventory sync job`);

    try {
      this.logger.log(`Running ${daysToSync}-day sync`);
      await this.syncInventory(daysToSync);
      this.logger.log(`Completed ${daysToSync}-day inventory sync`);
      return { message: `Synced ${daysToSync}-day inventory successfully` };
    } catch (error) {
      this.logger.error(`Error in ${daysToSync}-day inventory sync job`, { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }


  // async testLimiter() {
  //   const result = await this.limiter.schedule(() => {
  //     return new Promise((resolve) => {
  //       setTimeout(() => resolve("done"), 1000);
  //     });
  //   });
  //   console.log({result});
  //   return result;
  // }

}