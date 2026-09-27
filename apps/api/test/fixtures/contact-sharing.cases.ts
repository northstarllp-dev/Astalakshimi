/**
 * Messages the in-app chat must refuse, plus ordinary chat that must still send.
 * Covers plain contact data and the evasions called out in the moderation rules:
 * separators, spelled digits, double/triple, lookalike letters, emoji digits,
 * zero-width characters, full-width digits, and regional solicitation.
 */
export interface ContactSharingCase {
  label: string;
  text: string;
}

export const BLOCKED_CONTACT_MESSAGES: ContactSharingCase[] = [
  { label: 'indian mobile', text: 'Call me on 9876543210' },
  { label: 'mobile with spaces', text: 'My number is 98 765 43210' },
  { label: 'mobile with dashes and dots', text: 'Reach me at 98-765.432-10' },
  { label: 'plus-91 with spaces', text: 'WhatsApp +91 98765 43210' },
  { label: 'spelled english digits', text: 'nine eight seven six five four three two one zero' },
  { label: 'double and triple digit words', text: 'double nine double eight seven six five four three two' },
  { label: 'letter lookalikes inside a number', text: 'text 98765432lO' },
  { label: 'keycap emoji digits', text: 'my no 9️⃣8️⃣7️⃣6️⃣5️⃣4️⃣3️⃣2️⃣1️⃣0️⃣' },
  { label: 'zero-width characters between digits', text: '98765\u200B43210' },
  { label: 'full-width digits', text: '９８７６５４３２１０' },
  { label: 'plain email', text: 'mail me at priya.sharma@gmail.com' },
  { label: 'email written with at and dot', text: 'priya.sharma at gmail dot com' },
  { label: 'bracketed at and dot', text: 'priya(at)gmail(dot)com' },
  { label: 'upi okicici', text: 'pay priya.sharma@okicici' },
  { label: 'upi ybl', text: 'gpay priya98@ybl' },
  { label: 'instagram url', text: 'https://instagram.com/priya_sharma' },
  { label: 'instagram handle without url', text: 'insta: priya_sharma' },
  { label: 'instagram handle in a sentence', text: 'my insta is priya_sharma' },
  { label: 'generic at-handle', text: 'find me @priya_sharma' },
  { label: 'facebook url', text: 'facebook.com/priya.sharma' },
  { label: 'telegram link', text: 't.me/priya_sharma' },
  { label: 'telegram handle', text: 'tg: priya_sharma' },
  { label: 'whatsapp link', text: 'https://wa.me/919876543210' },
  { label: 'snapchat add link', text: 'snapchat.com/add/priya_sharma' },
  { label: 'ask for phone number', text: 'can you give me your phone number?' },
  { label: 'move to whatsapp', text: 'can we talk on whatsapp?' },
  { label: 'text me on telegram', text: 'text me on telegram' },
  { label: 'tamil number request', text: 'unga number kudunga' },
  { label: 'telugu number request', text: 'mee number cheppandi' },
  { label: 'kannada number request', text: 'nimma number kodi' },
  { label: 'malayalam number request', text: 'ningalude number tharumo' },
  { label: 'ask where they live', text: 'where do you live?' },
  { label: 'share address', text: 'please share your home address' },
  { label: 'street address', text: 'I stay at flat 12, 4th cross, Anna Nagar main road' },
  { label: 'landmark address', text: 'come near the temple opposite the bus stop in T Nagar' },
  { label: 'pincode', text: 'my pincode is 600001' },
  // ── New blocked cases: numbers in words ──
  { label: 'english tens and ones', text: 'ninety eight seventy six fifty four thirty two ten' },
  { label: 'hyphenated digit words', text: 'nine-eight-seven-six-five-four-three-two-one-zero' },
  { label: 'letter spaced digit words', text: 'n i n e e i g h t s e v e n s i x f i v e f o u r t h r e e t w o o n e z e r o' },
  { label: 'concatenated digit words', text: 'nineeightsevensixfivefourthreetwoonezero' },
  { label: 'misspelled digit words', text: 'nain ate sevan six fiv for tree to won zeero' },
  { label: 'hindi latin digit words', text: 'nau aath saat chhe paanch chaar teen do ek shunya' },
  { label: 'devanagari digits', text: '९८७६५४३२१०' },
  { label: 'tamil script digit words', text: 'ஒன்பது எட்டு ஏழு ஆறு ஐந்து நான்கு மூன்று இரண்டு ஒன்று' },
  // ── New blocked cases: phone format evasions ──
  { label: 'leading zero mobile', text: '09876543210' },
  { label: 'phone glued to word', text: 'call9876543210' },
  { label: 'landline', text: '044 2345 6789' },
  { label: 'international number', text: '+1 415 555 0134' },
  { label: 'eleven digit run', text: '98765432101' },
  // ── New blocked cases: email evasions ──
  { label: 'at the rate email', text: 'priya at the rate gmail dot com' },
  { label: 'bare provider name', text: 'priya sharma gmail' },
  { label: 'bracketed at and dot', text: 'priya[at]yahoo[dot]in' },
  { label: 'bare domain', text: 'visit priya dot in' },
  // ── New blocked cases: platforms and self-disclosure ──
  { label: 'linkedin with cue', text: 'add me on linkedin' },
  { label: 'my id is handle', text: 'my id is priya_98' },
  { label: 'bare whatsapp', text: 'whatsapp' },
  { label: 'call me', text: 'call me' },
  { label: 'text me', text: 'text me' },
  { label: 'my number is', text: 'my number is 98765' },
  // ── New blocked cases: Hinglish ──
  { label: 'apna number do', text: 'apna number do' },
  { label: 'mera number hai', text: 'mera number hai' },
  { label: 'whatsapp pe baat karo', text: 'whatsapp pe baat karo' },
  { label: 'number bhejo', text: 'number bhejo' },
  { label: 'call karo', text: 'call karo' },
];

/** Icebreakers and ordinary chat. These must not be treated as contact sharing. */
export const ALLOWED_CHAT_MESSAGES: ContactSharingCase[] = [
  { label: 'inbox icebreaker namaste', text: 'Namaste! Glad to connect with you.' },
  { label: 'inbox icebreaker profile', text: 'Hello! We liked your profile and would love to know more.' },
  { label: 'inbox icebreaker families', text: 'Hi! When is a good time for our families to talk?' },
  { label: 'profession', text: 'I work as a software engineer in Chennai.' },
  { label: 'hobby', text: 'I enjoy classical music and weekend travel.' },
  { label: 'age', text: 'I am 28 years old.' },
  // ── New allowed cases: protect against false positives ──
  { label: 'live for music', text: 'I live for music' },
  { label: 'no problem', text: 'no problem, talk tomorrow' },
  { label: 'siblings count', text: 'I have two brothers and one sister' },
  { label: 'birth year', text: 'born in 1996' },
  { label: 'salary', text: 'salary is 12 lakh' },
  { label: 'height', text: 'height 5 feet 8 inches' },
  { label: 'meet at 5pm', text: 'let us meet families at 5 pm' },
  { label: 'from chennai', text: 'we are from Chennai' },
  { label: 'often', text: 'I often visit the temple' },
  { label: 'someone', text: 'someone in your family should call' },
];
