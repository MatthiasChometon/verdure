import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ImageUpload } from '../../../infrastructure/http/image-upload';
import { IdentificationService } from '../../../infrastructure/identification/service';
import { AuthGuard } from '../../auth/currentUser/guard';
import { SpeciesReconciler } from '../../species/reconciler';
import { SkipTimeout } from '../../../infrastructure/http/request-timeout.interceptor';

@Controller('uploads')
// Exempt from the global request timeout: a 408 would not stop the work, and
// the caller would resend what the first attempt still commits. Bounded by the vision call's own timeout.
@SkipTimeout()
@UseGuards(AuthGuard)
export class IdentifyController {
  constructor(
    private readonly vision: IdentificationService,
    private readonly reconciler: SpeciesReconciler,
    private readonly imageUpload: ImageUpload,
  ) {}

  // Reconciles the vision guess against the local species index, falling back to GBIF.
  @Post('identify-plant')
  async identifyPlant(
    @Req() request: FastifyRequest,
  ): Promise<{ species: string | null }> {
    const image = await this.imageUpload.read(request);
    const guess = await this.vision.identifyPlant(image.buffer);
    if (guess === undefined) {
      return { species: null };
    }
    // The upload REST contract answers a null species, not an absent field.
    return { species: (await this.reconciler.reconcile(guess)) ?? null };
  }
}
