import { CreatePlantInput } from './save/input';

// Builder for plant creation inputs in tests — keeps the e2e cases short and
// expressive (only the fields that matter are set).
export class PlantInputBuilder {
  private input: CreatePlantInput = { name: 'Plant', species: 'Plantus' };

  named(name: string): this {
    this.input.name = name;
    return this;
  }

  ofSpecies(species: string): this {
    this.input.species = species;
    return this;
  }

  withImage(imageKey: string): this {
    this.input.imageKey = imageKey;
    return this;
  }

  tracked(summerDays: number | null, winterDays: number | null): this {
    this.input.wateringIntervalSummerDays = summerDays;
    this.input.wateringIntervalWinterDays = winterDays;
    return this;
  }

  build(): CreatePlantInput {
    return { ...this.input };
  }
}
