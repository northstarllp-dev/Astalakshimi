export const CONTACT_DATA_RULES = [
  // Phone numbers (Indian & International, loose matching after normalization)
  /(?:(?:\+|0{0,2})91(\s*[\-]*)?)?(\d{10})/gi,
  /\b\d{8,15}\b/gi,
  
  // Emails
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,

  // Socials / URLs
  /instagram\.com\/[a-zA-Z0-9_.]+/gi,
  /facebook\.com\/[a-zA-Z0-9_.]+/gi,
  /t\.me\/[a-zA-Z0-9_.]+/gi,
  /wa\.me\/\d+/gi,
  /snapchat\.com\/add\/[a-zA-Z0-9_.]+/gi,
  /@(?:username|insta|telegram|snapchat|whatsapp|fb|facebook|ig)/gi,
  /(?:www\.|https?:\/\/)[^\s]+/gi,

  // UPI IDs
  /[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/gi,

  // Common PIN codes (Indian context)
  /\b\d{6}\b/gi,
];

export const CONTACT_SOLICITATION_RULES = [
  // Broad phrase matchers for solicitations
  /(?:give|send|share|drop|tell me|what is|what's)\b.*\b(?:number|phone|whatsapp|wa|insta|instagram|ig|snapchat|snap|telegram|tg|fb|facebook)\b/gi,
  /(?:can i|may i|could i|can we)\b.*\b(?:have|get|know|ask)\b.*\b(?:number|phone|whatsapp|wa|insta|instagram|ig|snapchat|snap|telegram|tg|fb|facebook)\b/gi,
  
  // Variations of connecting outside
  /(?:can|shall|should) we (?:talk|chat|connect|speak) (?:on|over|outside|directly)\b/gi,
  /can i (?:call|text|message|ping) you\b/gi,
  
  // Specific app requests
  /connect on (whatsapp|insta|instagram|snapchat|telegram|fb|facebook)/gi,
  /(?:message|ping|text|hit me up) (?:me )?on\b/gi,
  
  // Location requests
  /where do you live/gi,
  /let('s| us) talk outside/gi,
];
