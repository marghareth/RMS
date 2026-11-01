// FILE: src/components/health/HealthTypeBadge.tsx
//
// Pill badge for a health record's type (Hypertension, Prenatal Checkup, …).
// Same look as StatusBadge (src/components/shared/StatusBadge.tsx): icon +
// label in normal case, soft tinted background, thin matching border — so the
// health list reads like the blotter / certificate status pills.
//
// Each type gets a simple line icon (lucide, the same icon set and stroke as
// the rest of the app) for what it is, plus its own color with a dark-mode
// version (dimmer tint, lighter text) so no badge glows white on a dark card.
//

// Matching is by name, ignoring case, and also by prefix, so variants like
// "Tuberculosis (DOTS)" or "Nutrition (OPT Plus)" pick up the right style.
// Unknown or custom types ("Other: …") get a neutral gray badge.

import {
  HeartPulse, Droplet, Pill, Baby, HandHeart, Stethoscope, Wind, CalendarHeart,
  Smile, Eye, Brain, Apple, Weight, Bug, Thermometer, Dog, ClipboardPlus,
  type LucideIcon,
} from "lucide-react";

type Tone =
  | "red" | "amber" | "orange" | "pink" | "rose" | "green" | "sky" | "purple"
  | "teal" | "cyan" | "indigo" | "lime" | "emerald" | "fuchsia" | "yellow" | "stone" | "gray";

// Full class strings (Tailwind only generates classes it can see written out).
const TONE_CLASSES: Record<Tone, string> = {
  red:     "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/25",
  amber:   "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/25",
  orange:  "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/25",
  pink:    "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/25",
  rose:    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/25",
  green:   "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/25",
  sky:     "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/25",
  purple:  "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/25",
  teal:    "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/25",
  cyan:    "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/25",
  indigo:  "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/25",
  lime:    "bg-lime-50 text-lime-800 border-lime-200 dark:bg-lime-500/10 dark:text-lime-400 dark:border-lime-500/25",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25",
  fuchsia: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-400 dark:border-fuchsia-500/25",
  yellow:  "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/25",
  stone:   "bg-stone-50 text-stone-700 border-stone-200 dark:bg-stone-500/10 dark:text-stone-300 dark:border-stone-500/25",
  gray:    "bg-gray-50 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-[#A3A3A3] dark:border-white/10",
};

type TypeStyle = { icon: LucideIcon; tone: Tone };

// Keys are lower-case record type names (or the start of one).
const TYPE_STYLES: Record<string, TypeStyle> = {
  "hypertension":       { icon: HeartPulse,    tone: "red" },     // heart / blood pressure
  "diabetes":           { icon: Droplet,       tone: "amber" },   // blood sugar drop
  "tuberculosis":       { icon: Pill,          tone: "orange" },  // daily DOTS medicine
  "prenatal checkup":   { icon: Baby,          tone: "pink" },
  "postnatal checkup":  { icon: HandHeart,     tone: "rose" },    // care after delivery
  "well-child checkup": { icon: Stethoscope,   tone: "green" },
  "asthma":             { icon: Wind,          tone: "sky" },     // breathing
  "family planning":    { icon: CalendarHeart, tone: "purple" },
  "dental checkup":     { icon: Smile,         tone: "teal" },
  "eye checkup":        { icon: Eye,           tone: "cyan" },
  "mental health":      { icon: Brain,         tone: "indigo" },
  "malnutrition":       { icon: Apple,         tone: "lime" },
  "nutrition":          { icon: Weight,        tone: "lime" },    // Operation Timbang (weighing)
  "malaria":            { icon: Bug,           tone: "emerald" }, // mosquito-borne
  "dengue":             { icon: Bug,           tone: "fuchsia" }, // mosquito-borne
  "covid-19":           { icon: Thermometer,   tone: "yellow" },  // fever
  "animal bite":        { icon: Dog,           tone: "stone" },
};

const FALLBACK: TypeStyle = { icon: ClipboardPlus, tone: "gray" };

export function healthTypeStyle(type: string): TypeStyle {
  const key = type.trim().toLowerCase();
  if (TYPE_STYLES[key]) return TYPE_STYLES[key];
  // "Tuberculosis (DOTS)", "Nutrition (OPT Plus)", "Dengue - suspected", …
  const prefix = Object.keys(TYPE_STYLES).find((k) => key.startsWith(k));
  return prefix ? TYPE_STYLES[prefix] : FALLBACK;
}

export default function HealthTypeBadge({ type }: { type: string }) {
  const { icon: Icon, tone } = healthTypeStyle(type);
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      <Icon size={12} strokeWidth={2.25} aria-hidden="true" className="shrink-0" />
      {type}
    </span>
  );
}