import { IsString, IsNumber, IsEnum, IsArray, IsObject, ValidateNested, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class LocationDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsString()
  address: string;
}

export class CreateProductDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsEnum(['TRY', 'USD', 'EUR', 'GBP'])
  currency: 'TRY' | 'USD' | 'EUR' | 'GBP';

  @IsString()
  category: string;

  @IsString()
  subCategory: string;

  @IsEnum(['new', 'like_new', 'used'])
  condition: 'new' | 'like_new' | 'used';

  @IsString()
  city: string;

  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  @IsOptional()
  location?: LocationDto;

  @IsArray()
  @IsString({ each: true })
  images: string[];
}
