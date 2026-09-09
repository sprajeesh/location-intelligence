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
} from "lucide-react";

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
