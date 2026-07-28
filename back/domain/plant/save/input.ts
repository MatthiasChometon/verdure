import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PlantConstraints } from '../plant-constraints';

@InputType()
export class CreatePlantInput {
  @Field()
  @IsNotEmpty()
  @MaxLength(PlantConstraints.nameMaxLength)
  name: string;

  @Field()
  @IsNotEmpty()
  @MaxLength(PlantConstraints.speciesMaxLength)
  species: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(PlantConstraints.descriptionMaxLength)
  description?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  imageKey?: string | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  wateringIntervalSummerDays?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  wateringIntervalWinterDays?: number | null;
}

@InputType()
export class UpdatePlantInput {
  @Field()
  @IsUUID()
  id: string;

  @Field()
  @IsNotEmpty()
  @MaxLength(PlantConstraints.nameMaxLength)
  name: string;

  @Field()
  @IsNotEmpty()
  @MaxLength(PlantConstraints.speciesMaxLength)
  species: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(PlantConstraints.descriptionMaxLength)
  description?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  imageKey?: string | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  wateringIntervalSummerDays?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  wateringIntervalWinterDays?: number | null;
}
