import { Controller, Get, Param, ParseIntPipe, Query, HttpStatus, HttpException, DefaultValuePipe, Post, Body } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from '@prisma/client';
import { DateInventory, Slots } from './dto';
import { IPage } from 'src/common/pages.interface';
import { IResponse } from 'src/common/response.interface';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async createProduct(@Body() product: Product): Promise<IResponse<IPage<Product>>> {
    try {
      const createdProduct = await this.productsService.createProduct(product);
      if(!createdProduct) {
        throw new HttpException("Product not created", HttpStatus.BAD_REQUEST);
      }
      return {data: { data: createdProduct }, statusCode: HttpStatus.CREATED};
    } catch (error) {
      throw new HttpException(
        error.message ?? "Internal Error",
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
  
  @Get()
  async getProducts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number, 
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number
  ): Promise<IResponse<IPage<Product[]>>> {
    try {
      const products = await this.productsService.getProducts(page, limit);
      return { data: products, statusCode: HttpStatus.OK };
    } catch (error) {
      throw new HttpException(
        error.message ?? "Internal Error",
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get(':productId')
  async getProductById(
    @Param('productId', ParseIntPipe) productId: number
  ): Promise<IResponse<IPage<Product>>> {
    try {
      const product = await this.productsService.getProductById(productId);
      return { data: product, statusCode: HttpStatus.OK };
    } catch (error) {
      throw new HttpException(
        error.message ?? "Internal Error",
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get(':productId/dates')
  async getProductDates(
    @Param('productId', ParseIntPipe) productId: number
  ): Promise<IResponse<IPage<DateInventory>>> {
    try {
      const dates = await this.productsService.getProductDates(productId);
      return { data: dates, statusCode: HttpStatus.OK };
    } catch (error) {
      throw new HttpException(
        error.message ?? "Internal Error",
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Get(':productId/slots')
  async getProductSlots(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('date') date: string
  ): Promise<IResponse<IPage<Slots>>> {
    try {
      const slots = await this.productsService.getProductSlots(productId, date);
      return { data: slots, statusCode: HttpStatus.OK };
    } catch (error) {
      throw new HttpException(
        error.message ?? "Internal Error",
        error.status ?? HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}