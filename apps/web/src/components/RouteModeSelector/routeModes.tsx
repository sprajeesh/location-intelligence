import type { LucideIcon } from "lucide-react";
import { Car, PersonStanding, Bike } from "lucide-react";
import type { RouteTransportMode } from "@/types/api";

export interface RouteModeButton {
  mode: RouteTransportMode;
  labelKey: string;
  icon: LucideIcon;
}

export const ROUTE_MODES: RouteModeButton[] = [
  { mode: "driving", labelKey: "driving", icon: Car },
  { mode: "walking", labelKey: "walking", icon: PersonStanding },
  { mode: "cycling", labelKey: "cycling", icon: Bike },
];
