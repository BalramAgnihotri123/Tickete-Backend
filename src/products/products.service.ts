import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Product } from '@prisma/client';
import { SlotData, DateInventory, DateAvailability, Slots } from './dto';
import { Prisma } from '@prisma/client';
import { IPage } from '../common/pages.interface';
import { formatDate, isValidDate } from '../utils/date.utils';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async createProduct(product: Product): Promise<Product> {
    return this.prisma.product.create({
      data: product,
    });
  }
  
  
  /**
   * Get all products
   * @returns all products
   * description: Get all products
   */
  async getProducts(page?: number, limit?: number): Promise<IPage<any>> {
    try {
      if (!page) page = 1;
      if (!limit) limit = 10;
      const totalLength = await this.prisma.product.count();
      const products = await this.prisma.product.findMany({
        orderBy: {
          id: 'asc',
        },
        select:{
          id: true,
          name: true,
          availableDays: true,
          timeSlotType: true,
        },
        take: limit,
        skip: (page - 1) * limit,
      });

      return { data: products, totalLength, page, limit };
    } catch (error) {
      throw error;
    }
  }


  /**
   * Get product by id
   * @param productId 
   * @returns product
   * description: Get product by id
   */
  async getProductById(productId: number): Promise<IPage<Product>> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      
      if (!product) {
        throw new Error('Product not found!');
      }
      return { data: product };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }


  /**
   * Get product dates
   * @param productId 
   * @returns product dates
   * description: Get product dates for a specific product id
   */
  async getProductDates(productId: number): Promise<IPage<DateInventory>> {
    try {
      // First get the product details
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          slots: {
            distinct: ['startDate'],
            orderBy: {
              startDate: 'asc',
            },
            include: {
              paxAvailabilities: {
                include: { pax: true },
              },
            },
          },
        },
      });
      
      if (!product) {
        throw new Error('Product not found');
      }
      const availableDates: DateAvailability[] = [];

      product.slots.forEach(slot => {
        const startDate = new Date(slot.startDate);
        availableDates.push({
          date: formatDate(startDate.toISOString()),
          price: {
            finalPrice: slot.paxAvailabilities?.[0]?.finalPrice ?? 0,
            originalPrice: slot.paxAvailabilities?.[0]?.originalPrice ?? 0,
            currencyCode: slot.paxAvailabilities?.[0]?.currencyCode ?? '',
          },
        });
      })

      return { data: { dates: availableDates } };
    } catch (error) {
      console.error('Error getting product dates:', error);
      throw error;
    }
  }


  /**
   * Get product slots
   * @param productId 
   * @param date 
   * @returns product slots
   * description: Get product slots for a specific date and product id
   */
  async getProductSlots(productId: number, date: string): Promise<IPage<Slots>> {
    try {
      // valid date format
      if (!date && !isValidDate(date)) {
        throw new Error('Date is required');
      }
      
      // parse date to date object
      const parsedDate = new Date(date);

      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: {
          slots: {
            where: {
              startDate: parsedDate,
            },
            orderBy: {
              startTime: 'asc',
            },
            select: {
              startTime: true,
              startDate: true,
              remaining: true,
              paxAvailabilities: {
                include: { pax: true },
              },
            },
          },
        },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      const slots: Slots = {
        slots: product.slots.map(slot => ({
          startTime: slot.startTime,
          startDate: slot.startDate.toISOString(),
          remaining: slot.remaining,
          paxAvailability: slot.paxAvailabilities.map(pax => ({
            type: pax.pax.type,
            name: pax.pax.name,
            description: pax.pax.description,
            min: pax.pax.min,
            max: pax.pax.max,
            remaining: pax.remaining,
            price: {
              finalPrice: pax.finalPrice,
              originalPrice: pax.originalPrice,
              currencyCode: pax.currencyCode,
              },
            })),
        })),
      };

      return { data: slots };
    } catch (error) {
      console.error('Error getting product slots:', error);
      throw error;
    }
  }



  /**
   ** Process inventory slot (Helper function for cron job)
   * @param productId 
   * @param slotData 
   * @returns void
   * @description Process inventory slot (Helper function)
   * @example
   * this.processInventorySlot(1, {
   *   providerSlotId: '123',
   *   startDate: '2023-01-01',
   *   endDate: '2023-01-02',
   *   remaining: 10,
   * });
   */
  async processInventorySlot(productId: number, slotData: SlotData) {
    console.log("Processing slot data");
  
    try {
      await this.prisma.$transaction(async (tx) => {
        const slot = await tx.slot.upsert({
          where: { providerSlotId: slotData.providerSlotId },
          update: { remaining: slotData.remaining },
          create: {
            productId,
            startDate: new Date(slotData.startDate),
            startTime: slotData.startTime,
            endTime: slotData.endTime,
            providerSlotId: slotData.providerSlotId,
            remaining: slotData.remaining,
            currencyCode: slotData.currencyCode,
          },
        });
  
        // Process all pax concurrently
        await Promise.all(
          slotData.paxAvailability.map(async (pax) => {
            if (typeof pax.type !== 'string') {
              return;
            }
            
            // Upsert pax
            const createdPax = await tx.pax.upsert({
              where: { type: pax.type },
              update: {
                name: pax.name,
                description: pax.description,
                min: pax.min,
                max: pax.max,
              },
              create: {
                type: pax.type,
                name: pax.name,
                description: pax.description,
                min: pax.min,
                max: pax.max,
              },
            });
  
            // Upsert pax availability with price information directly
            const paxAvailability = await tx.paxAvailability.upsert({
              where: {
                slotId_paxId: { slotId: slot.id, paxId: createdPax.id },
              },
              update: {
                remaining: pax.remaining,
                finalPrice: pax.price.finalPrice,
                originalPrice: pax.price.originalPrice,
                currencyCode: pax.price.currencyCode,
                discount: pax.price.discount || 0,
              },
              create: {
                slotId: slot.id,
                paxId: createdPax.id,
                remaining: pax.remaining,
                finalPrice: pax.price.finalPrice,
                originalPrice: pax.price.originalPrice,
                currencyCode: pax.price.currencyCode,
                discount: pax.price.discount || 0,
              },
            });
            console.log("Pax availability created/updated", paxAvailability);
          })
        );
  
        console.log("Slot processing complete!");
      }, {
        timeout: 50000,
        maxWait: 5000,
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
      });
    } catch (error) {
      console.error("Error processing inventory slot:", error);
      throw error;
    }
  }
  
}
