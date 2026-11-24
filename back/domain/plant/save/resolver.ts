import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { NicknameRepository } from '../../nickname/repository';
import { FileStorageService } from '../../../infrastructure/file-storage/service';
import { CurrentUser } from '../../auth/currentUser/current-user';
import { AuthGuard } from '../../auth/currentUser/guard';
import { User } from '../../user/model';
import { PlantGenus } from '../genus';
import { Plant } from '../model';
import { CreatePlantInput, UpdatePlantInput } from './input';
import { SaveRepository } from './repository';

@Resolver(() => Plant)
export class SaveResolver {
  constructor(
    private readonly repository: SaveRepository,
    private readonly storage: FileStorageService,
    private readonly nicknames: NicknameRepository,
    private readonly genus: PlantGenus,
  ) {}

  // Instant: no LLM in the hot path, picked from the pre-generated nickname bank.
  @Query(() => String, { nullable: true })
  @UseGuards(AuthGuard)
  async suggestPlantName(
    @CurrentUser() user: User,
    @Args('species', { type: () => String, nullable: true })
    species: string | null,
    @Args('lang', { type: () => String, nullable: true })
    lang: string | null,
  ): Promise<string | undefined> {
    const existing = await this.repository.namesOf(user.id);
    return this.nicknames.pick(this.genus.of(species), lang ?? 'en', existing);
  }

  @Mutation(() => Plant)
  @UseGuards(AuthGuard)
  createPlant(
    @CurrentUser() user: User,
    @Args('input') input: CreatePlantInput,
  ): Promise<Plant> {
    return this.repository.create(user.id, input);
  }

  @Mutation(() => Plant)
  @UseGuards(AuthGuard)
  updatePlant(
    @CurrentUser() user: User,
    @Args('input') input: UpdatePlantInput,
  ): Promise<Plant> {
    return this.repository.update(user.id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async deletePlant(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<boolean> {
    const deleted = await this.repository.delete(user.id, id);
    if (deleted === undefined) {
      return false;
    }
    if (deleted.imageKey !== null && deleted.imageKey !== undefined) {
      await this.storage.remove(deleted.imageKey);
    }
    return true;
  }
}
