import { IMAGES } from "@/lib/images"

export type MatchProfile = {
  id: string
  displayName: string
  fullName: string
  age: number
  gender: "Female" | "Male"
  height: string
  maritalStatus: string
  religion: string
  community: string
  motherTongue: string
  city: string
  state: string
  education: string
  college: string
  occupation: string
  company: string
  income: string
  about: string
  matchPercent: number
  lastActive: string
  verified: boolean
  photoVerified: boolean
  hasHoroscope: boolean
  photos: string[]
  lifestyle: {
    diet: string
    smoking: string
    drinking: string
  }
  family: {
    type: string
    values: string
    father: string
    mother: string
    siblings: string
  }
  preferences: {
    ageRange: string
    heightRange: string
    education: string
    location: string
    community: string
  }
}

export const MATCHES: MatchProfile[] = [
  {
    id: "ps-26-chennai",
    displayName: "P. S.",
    fullName: "Priya S.",
    age: 26,
    gender: "Female",
    height: "5'4\"",
    maritalStatus: "Never Married",
    religion: "Hindu",
    community: "Iyer",
    motherTongue: "Tamil",
    city: "Chennai",
    state: "Tamil Nadu",
    education: "B.Tech  Computer Science",
    college: "Anna University",
    occupation: "Software Engineer",
    company: "Infosys",
    income: "₹10 – 15 Lakh",
    about:
      "Family-oriented, calm, and career-driven. I enjoy classical music, weekend temple visits, and cooking with my mother. Looking for a partner who values respect, honesty, and shared family traditions.",
    matchPercent: 92,
    lastActive: "Online now",
    verified: true,
    photoVerified: true,
    hasHoroscope: true,
    photos: [...IMAGES.profiles.priya],
    lifestyle: { diet: "Vegetarian", smoking: "No", drinking: "No" },
    family: {
      type: "Nuclear family",
      values: "Traditional",
      father: "Retired banker",
      mother: "Homemaker",
      siblings: "1 younger brother",
    },
    preferences: {
      ageRange: "27 – 33 yrs",
      heightRange: "5'6\" – 6'1\"",
      education: "Graduate and above",
      location: "Chennai / Bengaluru / Hyderabad",
      community: "Iyer / Brahmin preferred",
    },
  },
  {
    id: "am-28-blr",
    displayName: "A. M.",
    fullName: "Ananya M.",
    age: 28,
    gender: "Female",
    height: "5'6\"",
    maritalStatus: "Never Married",
    religion: "Hindu",
    community: "Brahmin",
    motherTongue: "Kannada",
    city: "Bengaluru",
    state: "Karnataka",
    education: "MBA  Marketing",
    college: "IIM Bangalore",
    occupation: "Product Marketing Manager",
    company: "Flipkart",
    income: "₹20 – 30 Lakh",
    about:
      "Curious traveler and book lover. I balance a fast-paced career with quiet evenings and family dinners. Seeking a grounded partner who communicates well and grows with me.",
    matchPercent: 88,
    lastActive: "2 hours ago",
    verified: true,
    photoVerified: true,
    hasHoroscope: true,
    photos: [...IMAGES.profiles.ananya],
    lifestyle: { diet: "Eggetarian", smoking: "No", drinking: "Occasionally" },
    family: {
      type: "Joint family",
      values: "Moderate",
      father: "Business owner",
      mother: "Teacher",
      siblings: "1 elder sister",
    },
    preferences: {
      ageRange: "28 – 34 yrs",
      heightRange: "5'8\" – 6'2\"",
      education: "Postgraduate preferred",
      location: "Bengaluru / Anywhere in India",
      community: "Open to Brahmin communities",
    },
  },
  {
    id: "sk-25-cbe",
    displayName: "S. K.",
    fullName: "Shruti K.",
    age: 25,
    gender: "Female",
    height: "5'3\"",
    maritalStatus: "Never Married",
    religion: "Hindu",
    community: "Iyengar",
    motherTongue: "Tamil",
    city: "Coimbatore",
    state: "Tamil Nadu",
    education: "B.E  Electronics",
    college: "PSG College of Technology",
    occupation: "Design Engineer",
    company: "Bosch",
    income: "₹7 – 10 Lakh",
    about:
      "Simple, soft-spoken, and close to my family. I love classical dance and festival celebrations. Looking for someone kind, responsible, and family-oriented.",
    matchPercent: 85,
    lastActive: "Yesterday",
    verified: true,
    photoVerified: false,
    hasHoroscope: true,
    photos: [...IMAGES.profiles.shruti],
    lifestyle: { diet: "Vegetarian", smoking: "No", drinking: "No" },
    family: {
      type: "Nuclear family",
      values: "Traditional",
      father: "Government employee",
      mother: "Homemaker",
      siblings: "Only child",
    },
    preferences: {
      ageRange: "26 – 32 yrs",
      heightRange: "5'5\" – 6'0\"",
      education: "Engineer / Graduate",
      location: "Tamil Nadu / Karnataka",
      community: "Iyengar preferred",
    },
  },
  {
    id: "mr-27-mdu",
    displayName: "M. R.",
    fullName: "Meera R.",
    age: 27,
    gender: "Female",
    height: "5'5\"",
    maritalStatus: "Never Married",
    religion: "Hindu",
    community: "Nadar",
    motherTongue: "Tamil",
    city: "Madurai",
    state: "Tamil Nadu",
    education: "M.Sc  Biotechnology",
    college: "Madurai Kamaraj University",
    occupation: "Research Associate",
    company: "Biocon",
    income: "₹5 – 7 Lakh",
    about:
      "Warm, independent, and thoughtful. I enjoy temple festivals, long walks, and meaningful conversations. Seeking a respectful partner with strong values.",
    matchPercent: 81,
    lastActive: "Today",
    verified: true,
    photoVerified: true,
    hasHoroscope: false,
    photos: [...IMAGES.profiles.meera],
    lifestyle: { diet: "Vegetarian", smoking: "No", drinking: "No" },
    family: {
      type: "Joint family",
      values: "Traditional",
      father: "Business",
      mother: "Homemaker",
      siblings: "2 sisters",
    },
    preferences: {
      ageRange: "27 – 33 yrs",
      heightRange: "5'6\" – 6'0\"",
      education: "Postgraduate",
      location: "Tamil Nadu",
      community: "Nadar preferred",
    },
  },
  {
    id: "rv-29-chn",
    displayName: "R. V.",
    fullName: "Riya V.",
    age: 29,
    gender: "Female",
    height: "5'7\"",
    maritalStatus: "Never Married",
    religion: "Hindu",
    community: "Chettiar",
    motherTongue: "Tamil",
    city: "Chennai",
    state: "Tamil Nadu",
    education: "PhD  Economics",
    college: "University of Madras",
    occupation: "Assistant Professor",
    company: "Loyola College",
    income: "₹10 – 15 Lakh",
    about:
      "Academic by profession, artist at heart. I value intellect, kindness, and emotional maturity. Looking for a partner who enjoys learning and building a warm home.",
    matchPercent: 78,
    lastActive: "3 days ago",
    verified: true,
    photoVerified: true,
    hasHoroscope: true,
    photos: [...IMAGES.profiles.riya],
    lifestyle: { diet: "Vegetarian", smoking: "No", drinking: "No" },
    family: {
      type: "Nuclear family",
      values: "Moderate",
      father: "Doctor",
      mother: "Professor",
      siblings: "1 elder brother",
    },
    preferences: {
      ageRange: "29 – 36 yrs",
      heightRange: "5'8\" – 6'2\"",
      education: "Postgraduate / Doctorate",
      location: "Chennai / Anywhere",
      community: "Open within Hindu communities",
    },
  },
]

export function getMatchById(id: string) {
  return MATCHES.find((m) => m.id === id) ?? null
}

export function getAllMatchIds() {
  return MATCHES.map((m) => m.id)
}
