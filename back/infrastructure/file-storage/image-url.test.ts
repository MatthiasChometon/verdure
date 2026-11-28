import { describe, expect, it } from 'vitest';
import { ImageUrl } from './image-url';

const imageUrl = new ImageUrl();

const requestOn = (
  host: string,
): { protocol: 'http'; headers: { host: string } } => ({
  protocol: 'http',
  headers: { host },
});

describe('ImageUrl', () => {
  it('serves the image from the API on the request host', () => {
    expect(imageUrl.for('abc', requestOn('localhost:3000'))).toBe(
      'http://localhost:3000/images/abc',
    );
  });

  it('follows the host the browser used (LAN)', () => {
    expect(imageUrl.for('abc', requestOn('192.168.1.12:3000'))).toBe(
      'http://192.168.1.12:3000/images/abc',
    );
  });

  it('returns null when there is no image key', () => {
    expect(imageUrl.for(null, requestOn('localhost:3000'))).toBeNull();
  });
});
