import type { FastifyRequest } from 'fastify';
import { ImageUpload } from '../../../../infrastructure/http/image-upload';
import { IdentificationService } from '../../../../infrastructure/identification/service';
import { SpeciesReconciler } from '../../../species/reconciler';
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
  reconciler: Partial<SpeciesReconciler> = {},
): IdentifyController =>
  new IdentifyController(
    vision as IdentificationService,
    reconciler as SpeciesReconciler,
    new ImageUpload(),
  );

describe('IdentifyController identifyPlant', () => {
  it('reconciles the vision guess to a canonical species', async () => {
    const identifyPlant = vi.fn(() =>
      Promise.resolve("Monstera deliciosa 'Variegata'"),
    );
    const reconcile = vi.fn(() => Promise.resolve('Monstera deliciosa'));
    const controller = buildController({ identifyPlant }, { reconcile });

    await expect(
      controller.identifyPlant(requestWith(imageFile('image/jpeg'))),
    ).resolves.toEqual({ species: 'Monstera deliciosa' });
    expect(identifyPlant).toHaveBeenCalledWith(expect.any(Buffer));
    expect(reconcile).toHaveBeenCalledWith("Monstera deliciosa 'Variegata'");
  });

  it('returns null when the model cannot identify a plant', async () => {
    const identifyPlant = vi.fn(() => Promise.resolve(undefined));
    const controller = buildController({ identifyPlant });

    await expect(
      controller.identifyPlant(requestWith(imageFile('image/jpeg'))),
    ).resolves.toEqual({ species: null });
  });
});
