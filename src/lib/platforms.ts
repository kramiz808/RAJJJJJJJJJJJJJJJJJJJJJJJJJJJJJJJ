export type Platform = {
  id: string;
  name: string;
  tag: string;
  tagline: string;
  mirrors: { label: string; url: string }[];
  subjects: string[];
  status: "online" | "internal" | "soon";
  domain?: string;
  hue: number;
  bee?: { host: string; base?: string; page?: string };
};

export const TELEGRAM_COMMUNITY = "https://t.me/+04xCA1ldNEozOWI1";
export const TELEGRAM_CHANNEL = "https://t.me/studentstudy012";
export const ENROLL_KEY = "student_study_enrolled_batches";

const JEE = ["Physics", "Chemistry", "Maths"];
const NEET = ["Physics", "Chemistry", "Biology"];

export const PLATFORM_PORTALS: Record<string, { studybee: string; studypanda: string }> = {
  ms: { studybee: "https://studybeepro.in/", studypanda: "https://studypanda.live/" },
  sw: { studybee: "https://studybeepro.in/", studypanda: "https://studypanda.live/" },
  rwa: { studybee: "https://studybeepro.site/rwax", studypanda: "https://studypanda.live/" },
  ac: { studybee: "https://studybeepro.in/", studypanda: "https://studypanda.live/" },
  yo: { studybee: "https://studybeepro.site/yesoff", studypanda: "https://studypanda.live/" },
  sa: {
    studybee: "https://studybeepro.site/sachinacademy",
    studypanda: "https://studypanda.live/",
  },
  "ua-on": { studybee: "https://unc-bee.pages.dev/", studypanda: "https://studypanda.live/" },
  "ua-off": { studybee: "https://studybeepro.site/of-unc", studypanda: "https://studypanda.live/" },
  pw: { studybee: "https://studybeepro.in/", studypanda: "https://studypanda.live/" },
  nt: { studybee: "https://nt.studybeepro.site/", studypanda: "https://studypanda.live/" },
  pi: { studybee: "https://studybeepro.in/", studypanda: "https://studypanda.live/" },
  mj: { studybee: "https://studybeepro.site/mj", studypanda: "https://studypanda.live/" },
  vb: { studybee: "https://studybeepro.site/vibrante", studypanda: "https://studypanda.live/" },
};

export const PLATFORMS: Platform[] = [
  {
    id: "nt",
    hue: 25,
    domain: "nexttoppers.com",
    name: "Next Toppers",
    tag: "NT",
    tagline: "Class 9–12 toppers batches & Direct HD Streams",
    status: "online",
    subjects: ["Science", "Maths", "SST", "English", "Accounts", "Economics", "Business Studies"],
    mirrors: [],
  },
  {
    id: "pw",
    hue: 260,
    domain: "pw.live",
    name: "Physics Wallah",
    tag: "PW",
    tagline: "JEE · NEET · Foundation live batches",
    status: "online",
    subjects: [...JEE, "Biology"],
    mirrors: [],
  },
  {
    id: "ms",
    hue: 55,
    name: "Master Sahab",
    tag: "MS",
    tagline: "Pro Batch 2.0 (Class 10 Board & Sanskrit)",
    status: "online",
    subjects: ["Sanskrit", "Hindi", "Social Science", "Science"],
    mirrors: [],
  },
  {
    id: "sw",
    hue: 190,
    name: "Selection Way",
    tag: "SW",
    tagline: "Railway & SSC Direct Courses (Gagan Pratap Sir)",
    status: "online",
    subjects: ["Maths", "Reasoning", "GK/GS", "English"],
    mirrors: [],
  },
  {
    id: "rwa",
    hue: 15,
    domain: "rojgarwithankit.co.in",
    name: "Rojgar With Ankit",
    tag: "RWA",
    tagline: "SSC · Railway · Police exams (160+ Batches)",
    status: "online",
    subjects: ["Maths", "Reasoning", "Hindi", "GK/GS"],
    mirrors: [],
  },
  {
    id: "vb",
    hue: 320,
    domain: "vibrantacademy.com",
    name: "Vibrant Academy",
    tag: "VB",
    tagline: "Kota IIT-JEE Prime Batches",
    status: "online",
    subjects: JEE,
    mirrors: [],
  },
  {
    id: "mj",
    hue: 145,
    domain: "missionjeet.in",
    name: "Mission Jeet",
    tag: "MJ",
    tagline: "Board + Foundation prep",
    status: "online",
    subjects: ["Science", "Maths", "SST", "Biology"],
    mirrors: [],
  },
  {
    id: "pi",
    hue: 200,
    name: "PI Pro",
    tag: "PI",
    tagline: "All 20 Categories · NEET, JEE, UPSC, Board, Skills",
    status: "online",
    subjects: JEE,
    mirrors: [],
  },
  {
    id: "ua-on",
    hue: 160,
    domain: "unacademy.com",
    name: "Unacademy Online",
    tag: "UA-ON",
    tagline: "Kota Star Educators (JEE & NEET)",
    status: "online",
    subjects: [...JEE, "Biology"],
    mirrors: [],
  },
  {
    id: "ua-off",
    hue: 130,
    domain: "unacademy.com",
    name: "Unacademy Offline",
    tag: "UA-OFF",
    tagline: "Kota Classroom Live Batches",
    status: "online",
    subjects: NEET,
    mirrors: [],
  },
  {
    id: "ac",
    hue: 295,
    domain: "apnacollege.in",
    name: "Apna College",
    tag: "AC",
    tagline: "Alpha Java DSA · Delta Web Dev",
    status: "online",
    subjects: ["DSA", "Java", "Web Dev", "C++"],
    mirrors: [],
  },
  {
    id: "yo",
    hue: 220,
    domain: "yesofficer.com",
    name: "Yes Officer",
    tag: "YO",
    tagline: "Banking, PO & Clerk Special Batches",
    status: "online",
    subjects: ["Quant", "Reasoning", "English"],
    mirrors: [],
  },
  {
    id: "sa",
    hue: 180,
    domain: "sachinacademy.com",
    name: "Sachin Academy",
    tag: "SA",
    tagline: "CTET, KVS & Teaching Exams Special",
    status: "online",
    subjects: ["CDP", "EVS", "Hindi", "Maths"],
    mirrors: [],
  },
];

export const getPlatform = (id: string) => PLATFORMS.find((p) => p.id === id);

export function readEnrolled(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ENROLL_KEY) || "[]");
  } catch {
    return [];
  }
}
export function writeEnrolled(ids: string[]) {
  localStorage.setItem(ENROLL_KEY, JSON.stringify(ids));
}

const BEE_MAP: Record<string, string> = {
  sachin: "https://studybeepro.site/sachinacademy",
  sa: "https://studybeepro.site/sachinacademy",
  rwa: "https://studybeepro.site/rwax",
  yesofficer: "https://studybeepro.site/yesoff",
  yo: "https://studybeepro.site/yesoff",
  unc: "https://studybeepro.site/of-unc",
  "ua-off": "https://studybeepro.site/of-unc",
  "ua-on": "https://unc-bee.pages.dev",
  ms: "https://studybeepro.in",
  sw: "https://studybeepro.in",
  ac: "https://studybeepro.in",
  studypanda: "https://studypanda.live",
  studybee: "https://studybeepro.in",
  www: "https://studybeepro.in",
  nt: "https://nt.studybeepro.site",
  vb: "https://studybeepro.site/vibrante",
  mj: "https://studybeepro.site/mj",
};

export const BEE_HOSTS = [
  "nt",
  "yesofficer",
  "yo",
  "sachin",
  "sa",
  "rwa",
  "www",
  "vidya",
  "scienceandfun",
  "unc",
  "ua-on",
  "ua-off",
  "ms",
  "sw",
  "ac",
  "vb",
  "mj",
  "studypanda",
  "studybee",
];

export const isBeeHost = (h: string) => h in BEE_MAP || BEE_HOSTS.includes(h);

export const beeOrigin = (h: string) => {
  if (BEE_MAP[h]) return BEE_MAP[h];
  return h === "www" ? "https://studybeepro.in" : `https://${h}.learnxpw.site`;
};
