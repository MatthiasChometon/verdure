import { NicknameRepository } from '../../nickname/repository';
import { FileStorageService } from '../../../infrastructure/file-storage/service';
import { User } from '../../user/model';
import { SaveRepository } from './repository';
import { SaveResolver } from './resolver';

const buildResolver = (
  overrides: {
    storage?: Partial<FileStorageService>;
    repository?: Partial<SaveRepository>;
    nicknames?: Partial<NicknameRepository>;
  } = {},
): SaveResolver =>
  new SaveResolver(
    (overrides.repository ?? {}) as SaveRepository,
    (overrides.storage ?? {}) as FileStorageService,
    (overrides.nicknames ?? {}) as NicknameRepository,
  );

const user = { id: 'user-1' } as User;

describe('SaveResolver suggestPlantName', () => {
  it('picks from the genus bank, passing the genus, language and taken names', async () => {
    const namesOf = vi.fn(() => Promise.resolve(['Donald le Monstera']));
    const pick = vi.fn(() => Promise.resolve('Jean-Michel le Monstera'));
    const resolver = buildResolver({
      repository: { namesOf },
      nicknames: { pick },
    });

    await expect(
      resolver.suggestPlantName(user, 'Monstera deliciosa', 'fr'),
    ).resolves.toBe('Jean-Michel le Monstera');
    expect(namesOf).toHaveBeenCalledWith('user-1');
    // Genus is the first word of the species.
    expect(pick).toHaveBeenCalledWith('Monstera', 'fr', ['Donald le Monstera']);
  });

  it('uses the generic bank (no genus) when no species is given', async () => {
    const namesOf = vi.fn(() => Promise.resolve([]));
    const pick = vi.fn(() => Promise.resolve('Caramel'));
    const resolver = buildResolver({
      repository: { namesOf },
      nicknames: { pick },
    });

    await expect(resolver.suggestPlantName(user, null, 'fr')).resolves.toBe(
      'Caramel',
    );
    expect(pick).toHaveBeenCalledWith(undefined, 'fr', []);
  });

  it('defaults the language to English when none is provided', async () => {
    const namesOf = vi.fn(() => Promise.resolve([]));
    const pick = vi.fn(() => Promise.resolve('Kevin the Cactus'));
    const resolver = buildResolver({
      repository: { namesOf },
      nicknames: { pick },
    });

    await resolver.suggestPlantName(user, 'Cactus', null);
    expect(pick).toHaveBeenCalledWith('Cactus', 'en', []);
  });

  it('returns undefined when the bank has nothing left to offer', async () => {
    const namesOf = vi.fn(() => Promise.resolve([]));
    const pick = vi.fn(() => Promise.resolve(undefined));
    const resolver = buildResolver({
      repository: { namesOf },
      nicknames: { pick },
    });

    await expect(
      resolver.suggestPlantName(user, 'Ficus lyrata', 'en'),
    ).resolves.toBeUndefined();
  });
});
