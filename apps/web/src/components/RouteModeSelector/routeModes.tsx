import React from "react";
import { Car, PersonStanding, Bike } from "lucide-react";
import type { RouteTransportMode } from "@/types/api";

export interface RouteModeButton {
  mode: RouteTransportMode;
  labelKey: string;
  icon: React.ReactNode;
}

export const ROUTE_MODES: RouteModeButton[] = [
  { mode: "driving", labelKey: "driving", icon: <Car className="w-4 h-4" aria-hidden="true" /> },
  { mode: "walking", labelKey: "walking", icon: <PersonStanding className="w-4 h-4" aria-hidden="true" /> },
  { mode: "cycling", labelKey: "cycling", icon: <Bike className="w-4 h-4" aria-hidden="true" /> },
];
