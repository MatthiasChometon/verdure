import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes a password to a salted digest that is not the plaintext', async () => {
    const hash = await service.hash('correct horse battery');

    expect(hash).not.toContain('correct horse battery');
    expect(hash).toContain(':');
  });

  it('produces a different hash each time (random salt)', async () => {
    const [first, second] = await Promise.all([
      service.hash('same-password'),
      service.hash('same-password'),
    ]);

    expect(first).not.toBe(second);
  });

  it('verifies a password against its own hash', async () => {
    const hash = await service.hash('s3cret-passphrase');

    await expect(service.verify('s3cret-passphrase', hash)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await service.hash('s3cret-passphrase');

    await expect(service.verify('wrong-password', hash)).resolves.toBe(false);
  });

  it('rejects a malformed stored hash without throwing', async () => {
    await expect(service.verify('whatever', 'not-a-valid-hash')).resolves.toBe(
      false,
    );
  });
});

describe('PasswordService.pretendToVerify', () => {
  it('always answers false, as an unknown account would', async () => {
    const service = new PasswordService();

    await expect(service.pretendToVerify('anything')).resolves.toBe(false);
    await expect(service.pretendToVerify('anything')).resolves.toBe(false);
  });

  it('derives a key on every call, like a real verification', async () => {
    const service = new PasswordService();
    const verify = vi.spyOn(service, 'verify');

    await service.pretendToVerify('first');
    await service.pretendToVerify('second');

    expect(verify).toHaveBeenCalledTimes(2);
  });
});
