import { FileStorageService } from '../../../../infrastructure/file-storage/service';
import { Plant } from '../../model';
import { ListRepository } from '../repository';
import { ListResolver } from '../resolver';

const buildResolver = (
  overrides: {
    storage?: Partial<FileStorageService>;
    repository?: Partial<ListRepository>;
  } = {},
): ListResolver =>
  new ListResolver(
    (overrides.repository ?? {}) as ListRepository,
    (overrides.storage ?? {}) as FileStorageService,
  );

const plantWith = (imageKey: string | null): Plant => ({
  id: '1',
  name: 'Monstera',
  species: 'Monstera deliciosa',
  description: null,
  imageKey,
  wateringIntervalSummerDays: null,
  wateringIntervalWinterDays: null,
  lastWateredOn: null,
  nextDueOn: null,
});

describe('ListResolver imageUrl', () => {
  it('returns a presigned url when the plant has an image key', async () => {
    const getSignedUrl = vi.fn(() => Promise.resolve('https://signed'));
    const resolver = buildResolver({ storage: { getSignedUrl } });

    await expect(resolver.imageUrl(plantWith('plants/abc'))).resolves.toBe(
      'https://signed',
    );
    expect(getSignedUrl).toHaveBeenCalledWith('plants/abc');
  });

  it('returns null and skips storage when the plant has no image key', async () => {
    const getSignedUrl = vi.fn();
    const resolver = buildResolver({ storage: { getSignedUrl } });

    await expect(resolver.imageUrl(plantWith(null))).resolves.toBeNull();
    expect(getSignedUrl).not.toHaveBeenCalled();
  });
});
