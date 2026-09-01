import * as fs from 'fs';
import * as path from 'path';

function fixFile(filePath: string) {
  const p = path.resolve(process.cwd(), filePath);
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/<<<<<<< HEAD[\s\S]*?=======\n([\s\S]*?)>>>>>>> [a-f0-9]+\n/g, "$1");
  fs.writeFileSync(p, content);
  console.log('Fixed', filePath);
}

fixFile('apps/web/src/hooks/queries.ts');
fixFile('apps/web/src/lib/validation.ts');
fixFile('packages/database/src/schema/profiles.ts');

const jPath = path.resolve(process.cwd(), 'packages/database/migrations/meta/_journal.json');
let jContent = fs.readFileSync(jPath, 'utf8');
jContent = jContent.replace(/<<<<<<< HEAD\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> [a-f0-9]+\n/g, "$1\n$2").replace(/\}([\n\s]+)\{/g, "},\n$1{");
fs.writeFileSync(jPath, jContent);

