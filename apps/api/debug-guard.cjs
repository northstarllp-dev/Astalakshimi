const { normalizeForModeration, scoreMessage } = require('./src/chat/guard/rules.constant');
const { convertNumberWords } = require('./src/chat/guard/number-words.util');

const cases = [
  'my pincode is 600001',
  'n i n e e i g h t s e v e n s i x',
  'nain ate sevan six fiv for tree to won zeero',
  'priya sharma gmail',
  'add me on linkedin',
  'let us meet families at 5 pm',
  'ninety eight seventy six fifty four thirty two ten',
  'nineeightsevensixfivefourthreetwoonezero',
  'nau aath saat chhe paanch chaar teen do ek shunya',
  '९८७६५४३२१०',
];

for (const c of cases) {
  const words = convertNumberWords(c.toLowerCase());
  const norm = normalizeForModeration(c);
  const score = scoreMessage(c);
  console.log(JSON.stringify({ input: c, words, norm, score }, null, 0));
}
