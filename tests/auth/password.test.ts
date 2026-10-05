import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/server/auth/password.ts';

describe('password hashing', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('correct horse battery', hash)).toBe(true);
    expect(await verifyPassword('correct horse batterz', hash)).toBe(false);
  });

  it('uses a random salt', async () => {
    expect(await hashPassword('same password 123')).not.toBe(await hashPassword('same password 123'));
  });

  it('rejects short passwords and malformed hashes', async () => {
    await expect(hashPassword('short')).rejects.toThrow();
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
  });
});
