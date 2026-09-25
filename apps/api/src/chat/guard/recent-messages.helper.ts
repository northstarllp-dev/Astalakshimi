import { and, desc, eq, gte } from 'drizzle-orm';
import type { Database } from '@astalakshimi/database';
import { messages } from '@astalakshimi/database';

const RECENT_MESSAGE_WINDOW_MS = 5 * 60 * 1000;
const RECENT_MESSAGE_LIMIT = 20;

export async function getRecentSenderMessageTexts(
  db: Database,
  senderProfileId: string,
  receiverProfileId: string,
): Promise<string[]> {
  const since = new Date(Date.now() - RECENT_MESSAGE_WINDOW_MS);
  const rows = await db
    .select({ text: messages.text })
    .from(messages)
    .where(
      and(
        eq(messages.senderProfileId, senderProfileId),
        eq(messages.receiverProfileId, receiverProfileId),
        gte(messages.createdAt, since),
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(RECENT_MESSAGE_LIMIT);

  return rows.reverse().map((row) => row.text);
}
