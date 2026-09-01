import { createDbClient } from '../src/client';
import { subscriptions, plans, users } from '../src/schema';
import { eq } from 'drizzle-orm';

async function run() {
  const db = createDbClient();
  const [silverPlan] = await db.select().from(plans).where(eq(plans.slug, 'silver')).limit(1);
  
  if (!silverPlan) {
    console.error("Silver plan not found!");
    process.exit(1);
  }
  
  // Get all users who don't have an active subscription
  const allUsers = await db.select({ id: users.id }).from(users);
  
  const activeSubs = await db.select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'active'));
    
  const activeUserIds = new Set(activeSubs.map(s => s.userId));
  
  const usersToUpdate = allUsers.filter(u => !activeUserIds.has(u.id));
  
  console.log(`Found ${usersToUpdate.length} users to grant Silver plan to.`);
  
  let count = 0;
  for (const u of usersToUpdate) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + silverPlan.durationDays);
    await db.insert(subscriptions).values({
      userId: u.id,
      planId: silverPlan.id,
      status: 'active',
      startsAt: new Date(),
      expiresAt,
    });
    count++;
  }
  
  console.log(`Granted Silver plan to ${count} existing users.`);
}

run().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
