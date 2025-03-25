import { Controller, Get, Post, Body, HttpException, HttpStatus, Query, ParseIntPipe, DefaultValuePipe, Put } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Logger } from '@nestjs/common';
import { IResponse } from 'src/common/response.interface';
import { IPage } from 'src/common/pages.interface';
import { CronJob } from '@prisma/client';

@Controller('admin')
export class AdminController {
    private readonly logger = new Logger(AdminController.name);
    constructor(private readonly adminService: AdminService) {}

    @Get('cron')
    async getCronJobs(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
    ): Promise<IResponse<IPage<CronJob[]>>> {
        try {
            const cronJobs = await this.adminService.getCronJobs(page, limit);
            return { data: cronJobs, statusCode: HttpStatus.OK };
        } catch (error) {
            this.logger.error("Error fetching cron jobs:", error);
            throw new HttpException(
                error.message ?? "Internal Error",
                error.status ?? HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    @Put('cron/toggle')
    async toggleCron(@Body() body: { name: string, status: boolean }): Promise<IResponse<IPage<any>>> {
        try {
            const result = await this.adminService.toggleCron(body.name, body.status);
            return { data: result, statusCode: HttpStatus.OK };
        } catch (error) {
            this.logger.error("Error toggling cron job:", error);
            throw new HttpException(
                error.message ?? "Internal Error",
                error.status ?? HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    @Get('cron/trigger')
    async triggerCron(@Query('name') name: string): Promise<IResponse<IPage<any>>> {
        try {
            const result = await this.adminService.triggerCron(name);
            return { data: result, statusCode: HttpStatus.OK };
        } catch (error) {
            this.logger.error("Error triggering cron job:", error);
            throw new HttpException(
                error.message ?? "Internal Error",
                error.status ?? HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

    @Get('cron/sync')
    async syncNextXDays(@Query('daysToSync', new DefaultValuePipe(1), ParseIntPipe) daysToSync: number): Promise<IResponse<IPage<any>>> {
        try {
            const result = await this.adminService.syncNextXDays(daysToSync);
            return { data: result, statusCode: HttpStatus.OK };
        } catch (error) {
            this.logger.error(`Error syncing next ${daysToSync} days:`, error);
            throw new HttpException(
                error.message ?? "Internal Error",
                error.status ?? HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }
}