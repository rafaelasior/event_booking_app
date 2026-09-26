import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SetEventCategoriesDto {
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  categoryIds!: number[];
}