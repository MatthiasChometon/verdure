// Prints the session tokens (comma separated) of the 5 seeded accounts: an HS256 JWT per
// account, signed with JWT_SECRET like the API does. No dependency.
import { createHmac } from 'node:crypto';

const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error('JWT_SECRET is required');
}

const encode = (value) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');
const now = Math.floor(Date.now() / 1000);

const tokens = [1, 2, 3, 4, 5].map((n) => {
  const head = encode({ alg: 'HS256', typ: 'JWT' });
  const body = encode({
    sub: `00000000-0000-4000-8000-00000000000${n}`,
    iat: now,
    exp: now + 86_400,
  });
  const signature = createHmac('sha256', secret)
    .update(`${head}.${body}`)
    .digest('base64url');
  return `${head}.${body}.${signature}`;
});

process.stdout.write(tokens.join(','));
