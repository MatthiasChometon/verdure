import { describe, expect, it } from 'vitest';
import { isPushEndpoint } from './is-push-endpoint';

describe('isPushEndpoint', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/abc',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://web.push.apple.com/abc',
    'https://wns2-par02p.notify.windows.com/w/?token=abc',
  ])('accepts the push service endpoint %s', (endpoint) => {
    expect(isPushEndpoint(endpoint)).toBe(true);
  });

  it.each([
    'http://fcm.googleapis.com/fcm/send/abc',
    'https://localhost/hook',
    'https://127.0.0.1/hook',
    'http://169.254.169.254/latest/meta-data',
    'https://evil.example/fcm.googleapis.com',
    'https://fcm.googleapis.com.evil.example/x',
    'https://evilfcm.googleapis.com.example/x',
    'https://user:pass@fcm.googleapis.com/x',
    'https://fcm.googleapis.com:8443/x',
    'not a url',
    '',
  ])('refuses %s', (endpoint) => {
    expect(isPushEndpoint(endpoint)).toBe(false);
  });

  it('refuses a value that is not a string', () => {
    expect(isPushEndpoint(42)).toBe(false);
  });
});
