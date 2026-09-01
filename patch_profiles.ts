import * as fs from 'fs';

const filePath = 'apps/api/src/profiles/profiles.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
`<<<<<<< HEAD
  specializations,
=======
  plans,
  subscriptions,
>>>>>>> e9accdb (chore: save local changes before pulling main)`,
`  specializations,
  plans,
  subscriptions,`
);

fs.writeFileSync(filePath, content);
