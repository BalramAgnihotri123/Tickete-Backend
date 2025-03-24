import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { CronJob } from '@prisma/client';
import { IPage } from 'src/common/pages.interface';
import { CronService } from 'src/cron/cron.service';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);
    constructor(
        private readonly cronService: CronService
    ) {}

    /**
     * Get all cron jobs
     * @returns all cron jobs
     * description: Get all cron jobs
     */
    async getCronJobs(page?: number, limit?: number): Promise<IPage<CronJob[]>> {
        try {
            if (!page) page = 1;
            if (!limit) limit = 10;
            const data = await this.cronService.getAllCrons(page, limit);

            // check if data is empty
            if (!data) {
                throw new Error("No cron jobs found");
            }
            
            return { data: data.data, totalLength: data.totalLength, page: data.page, limit: data.limit };
        } catch (error) {
            this.logger.error("Error fetching cron jobs:", error);
            throw error;
        }
    }

    /**
     * Toggle cron job
     * @param name - name of the cron job
     * @param status - status of the cron job
     * @returns the result of the toggle
     * description: Toggle cron job
     */
    async toggleCron(name: string, status: boolean): Promise<IPage<any>> {
        try {
            const result = await this.cronService.toggleCron(name, status);
            
            // check if result is empty
            if (!result) {
                throw new Error("Failed to toggle cron job");
            }

            return { data: result.message };
        } catch (error) {
            this.logger.error("Error toggling cron job:", error);
            throw error;
        }
    }

    /**
     * Trigger cron job
     * @param name - name of the cron job
     * @returns the result of the trigger
     * description: Trigger cron job
     */
    async triggerCron(name: string): Promise<IPage<any>> {
        try {
            const result = this.cronService.triggerCron(name);

            // check if result is empty
            if (!result) {
                throw new Error("Failed to trigger cron job");
            }

            return { data: result.message };
        } catch (error) {
            this.logger.error("Error triggering cron job:", error);
            throw error;
        }
    }

    /**
     * Sync next X days
     * @param daysToSync - number of days to sync
     * @returns the result of the sync
     * description: Sync next X days
     */
    async syncNextXDays(daysToSync: number): Promise<IPage<any>> {
        try {
            // check if daysAhead is between 1 and 60
            if (daysToSync < 1 || daysToSync > 60) {
                throw new Error("Invalid number of days to sync, should be between 1 and 60");
            }
            const result = await this.cronService.syncNextXDays(daysToSync);

            // check if result is empty
            if (!result) {
                throw new Error("Failed to sync next X days");
            }

            return { data: result.message };
        } catch (error) {
            this.logger.error("Error syncing next X days:", error);
            throw error;
        }
    }
}
