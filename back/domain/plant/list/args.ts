import { ArgsType, Field, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PlantSortField, SortDirection } from './enum';

@ArgsType()
export class PlantsArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  // Facet filters (combinable): restrict to a genus and/or presence of a photo.
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  genus?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  hasImage?: boolean;

  @Field(() => PlantSortField, { defaultValue: PlantSortField.RELEVANCE })
  @IsEnum(PlantSortField)
  sort: PlantSortField = PlantSortField.RELEVANCE;

  @Field(() => SortDirection, { defaultValue: SortDirection.DESC })
  @IsEnum(SortDirection)
  direction: SortDirection = SortDirection.DESC;

  @Field(() => Int, { defaultValue: 12 })
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 12;

  @Field(() => Int, { defaultValue: 0 })
  @IsInt()
  @Min(0)
  offset: number = 0;
}
