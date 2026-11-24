import 'dotenv/config';
import { validateEnvironment } from './env';

// Run by devops/deploy/deploy.sh from the app directory, on the .env the server
// will really boot with, before the app is restarted: a bad .env then keeps the
// running version up instead of taking it down.
try {
  validateEnvironment(process.env, { deployed: true });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
