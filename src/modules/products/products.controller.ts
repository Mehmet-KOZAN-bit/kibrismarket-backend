import { Controller, Post, Body, UseGuards, Param, Patch } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(AuthGuard)
  async create(
    @CurrentUser('uid') userId: string,
    @Body() productData: CreateProductDto,
  ) {
    return this.productsService.createListing(userId, productData);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  async update(
    @CurrentUser('uid') userId: string,
    @Param('id') id: string,
    @Body('price') price: number,
  ) {
    return this.productsService.updateListing(userId, id, { price });
  }

  @Patch(':id/approve')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async approve(@Param('id') id: string) {
    return this.productsService.approveListing(id);
  }

  @Patch(':id/reject')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async reject(@Param('id') id: string) {
    return this.productsService.rejectListing(id);
  }
}
