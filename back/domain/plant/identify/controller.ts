import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ImageUpload } from '../../../infrastructure/http/image-upload';
import { TaxonomyService } from '../../../infrastructure/taxonomy/service';
import { IdentificationService } from '../../../infrastructure/identification/service';
import { AuthGuard } from '../../auth/currentUser/guard';
import { SpeciesRepository } from '../../species/repository';

@Controller('uploads')
@UseGuards(AuthGuard)
export class IdentifyController {
  constructor(
    private readonly vision: IdentificationService,
    private readonly gbif: TaxonomyService,
    private readonly speciesRepository: SpeciesRepository,
    private readonly imageUpload: ImageUpload,
  ) {}

  // Identify a plant from a photo via the local vision API, then reconcile the
  // guess against the local species index (GBIF as a fallback) so the result
  // is always a real, canonical species name.
  @Post('identify-plant')
  async identifyPlant(
    @Req() request: FastifyRequest,
  ): Promise<{ species: string | null }> {
    const image = await this.imageUpload.read(request);
    const guess = await this.vision.identifyPlant(image.buffer);
    if (guess === undefined) {
      return { species: null };
    }

    // Keep the "Genus species" binomial, dropping cultivars / punctuation.
    const binomial = guess
      .replace(/[^\p{L}\s]/gu, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .join(' ');
    if (binomial === '') {
      return { species: null };
    }

    const local = await this.speciesRepository.match(binomial);
    if (local !== undefined) {
      return { species: local };
    }
    const [fallback] = await this.gbif.suggest(binomial);
    return { species: fallback?.name ?? binomial };
  }
}
