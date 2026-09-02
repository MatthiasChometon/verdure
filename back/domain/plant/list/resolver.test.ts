import type { FastifyRequest } from 'fastify';
import { Plant } from '../model';
import { ListRepository } from './repository';
import { ListResolver } from './resolver';

const resolver = new ListResolver({} as ListRepository);

const contextFor = (host: string): { req: FastifyRequest } => ({
  req: { protocol: 'http', headers: { host } } as unknown as FastifyRequest,
});

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
  winterRest: false,
});

describe('ListResolver imageUrl', () => {
  it('serves the image from the API on the request host', () => {
    expect(resolver.imageUrl(plantWith('abc'), contextFor('localhost:3000'))).toBe(
      'http://localhost:3000/images/abc',
    );
  });

  it('follows the host the browser used (LAN)', () => {
    expect(
      resolver.imageUrl(plantWith('abc'), contextFor('192.168.1.12:3000')),
    ).toBe('http://192.168.1.12:3000/images/abc');
  });

  it('returns null when the plant has no image key', () => {
    expect(resolver.imageUrl(plantWith(null), contextFor('localhost:3000'))).toBeNull();
  });
});
