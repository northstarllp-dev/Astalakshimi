import { db } from './src';
import { notifications } from './src/schema/notifications';
import { isNull } from 'drizzle-orm';

async function main() {
  const result = await db.select().from(notifications).where(isNull(notifications.actorProfileId));
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}
main();
