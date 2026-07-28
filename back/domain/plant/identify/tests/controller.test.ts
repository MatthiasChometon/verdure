import type { FastifyRequest } from 'fastify';
import { ImageUpload } from '../../../../infrastructure/http/image-upload';
import { TaxonomyService } from '../../../../infrastructure/taxonomy/service';
import { IdentificationService } from '../../../../infrastructure/identification/service';
import { SpeciesRepository } from '../../../species/repository';
import { IdentifyController } from '../controller';

type UploadedFile = { mimetype: string; toBuffer: () => Promise<Buffer> };

const requestWith = (file: UploadedFile | undefined): FastifyRequest =>
  ({ file: () => Promise.resolve(file) }) as unknown as FastifyRequest;

const imageFile = (mimetype: string): UploadedFile => ({
  mimetype,
  toBuffer: () => Promise.resolve(Buffer.from('bytes')),
});

const buildController = (
  vision: Partial<IdentificationService> = {},
  gbif: Partial<TaxonomyService> = {},
  speciesRepository: Partial<SpeciesRepository> = {},
): IdentifyController =>
  new IdentifyController(
    vision as IdentificationService,
    gbif as TaxonomyService,
    speciesRepository as SpeciesRepository,
    new ImageUpload(),
  );

describe('IdentifyController identifyPlant', () => {
  it('reconciles the vision guess against the local species index', async () => {
    const identifyPlant = vi.fn(() =>
      Promise.resolve("Monstera deliciosa 'Variegata'"),
    );
    const match = vi.fn(() => Promise.resolve('Monstera deliciosa'));
    const controller = buildController({ identifyPlant }, {}, { match });

    await expect(
      controller.identifyPlant(requestWith(imageFile('image/jpeg'))),
    ).resolves.toEqual({ species: 'Monstera deliciosa' });
    expect(identifyPlant).toHaveBeenCalledWith(expect.any(Buffer));
    expect(match).toHaveBeenCalledWith('Monstera deliciosa');
  });

  it('falls back to GBIF when the local index has no match', async () => {
    const identifyPlant = vi.fn(() => Promise.resolve('Aloe vera'));
    const match = vi.fn(() => Promise.resolve(undefined));
    const suggest = vi.fn(() =>
      Promise.resolve([{ key: 1, name: 'Aloe vera' }]),
    );
    const controller = buildController(
      { identifyPlant },
      { suggest },
      { match },
    );

    await expect(
      controller.identifyPlant(requestWith(imageFile('image/jpeg'))),
    ).resolves.toEqual({ species: 'Aloe vera' });
    expect(suggest).toHaveBeenCalledWith('Aloe vera');
  });

  it('returns null when the model cannot identify a plant', async () => {
    const identifyPlant = vi.fn(() => Promise.resolve(undefined));
    const controller = buildController({ identifyPlant });

    await expect(
      controller.identifyPlant(requestWith(imageFile('image/jpeg'))),
    ).resolves.toEqual({ species: null });
  });
});
