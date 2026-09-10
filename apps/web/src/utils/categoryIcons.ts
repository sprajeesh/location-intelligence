import type { LucideIcon } from "lucide-react";
import {
  School,
  Baby,
  University,
  Library,
  Trees,
  FerrisWheel,
  Bus,
  TrainFront,
  Hospital,
  Stethoscope,
  Pill,
  ShoppingCart,
  UtensilsCrossed,
  Martini,
  MapPin,
  GraduationCap,
  HeartPulse,
  ShoppingBag,
} from "lucide-react";
import type { CategoryId } from "@/types/api";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  schools: School,
  kindergartens: Baby,
  universities: University,
  libraries: Library,
  parks: Trees,
  playgrounds: FerrisWheel,
  bus_stops: Bus,
  railway_stations: TrainFront,
  hospitals: Hospital,
  gps: Stethoscope,
  pharmacies: Pill,
  supermarkets: ShoppingCart,
  restaurants: UtensilsCrossed,
  pubs_bars: Martini,
};

export function getCategoryIcon(categoryId: string): LucideIcon {
  return CATEGORY_ICONS[categoryId] ?? MapPin;
}

const SCORE_CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  education: GraduationCap,
  transport: Bus,
  healthcare: HeartPulse,
  shopping: ShoppingBag,
  recreation: Trees,
  food_and_drink: UtensilsCrossed,
};

export function getScoreCategoryIcon(categoryId: CategoryId): LucideIcon {
  return SCORE_CATEGORY_ICONS[categoryId];
}
