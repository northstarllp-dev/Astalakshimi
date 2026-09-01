import * as fs from 'fs';
import * as path from 'path';

function resolveFile(filePath: string, handler: (content: string) => string) {
  const p = path.resolve(process.cwd(), filePath);
  let content = fs.readFileSync(p, 'utf8');
  content = handler(content);
  fs.writeFileSync(p, content);
  console.log('Resolved', filePath);
}

// 1. profiles.service.ts
resolveFile('apps/api/src/profiles/profiles.service.ts', (content) => {
  return content.replace(/<<<<<<< HEAD\n\s*specializations,\n=======\n\s*plans,\n\s*subscriptions,\n>>>>>>> [a-f0-9]+ .*\n/g, 
  "  specializations,\n  plans,\n  subscriptions,\n");
});

// 2. queries.ts
resolveFile('apps/web/src/hooks/queries.ts', (content) => {
  return content.replace(/<<<<<<< HEAD[\s\S]*?=======\n([\s\S]*?)>>>>>>> [a-f0-9]+ .*\n/g, "$1");
});

// 3. validation.ts
resolveFile('apps/web/src/lib/validation.ts', (content) => {
  return content.replace(/<<<<<<< HEAD[\s\S]*?=======\n([\s\S]*?)>>>>>>> [a-f0-9]+ .*\n/g, "$1");
});

// 4. _journal.json
// Drizzle journal is an array of objects. We can just take BOTH arrays.
resolveFile('packages/database/migrations/meta/_journal.json', (content) => {
  // It's probably easier to just parse the JSON without the markers and fix the array.
  // But let's just strip the markers and fix commas manually or keep HEAD for now.
  // Actually, we can regenerate the journal with drizzle-kit, or just accept both.
  return content.replace(/<<<<<<< HEAD\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> [a-f0-9]+ .*\n/g, "$1\n$2").replace(/\}([\n\s]+)\{/g, "},\n$1{");
});

// 5. profiles.ts (schema)
resolveFile('packages/database/src/schema/profiles.ts', (content) => {
  return content.replace(/<<<<<<< HEAD[\s\S]*?=======\n([\s\S]*?)>>>>>>> [a-f0-9]+ .*\n/g, "$1");
});
