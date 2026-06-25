"use client";

import React, { useEffect, useRef } from "react";
import { Layers, Map, Satellite, Mountain } from "lucide-react";
import { ToolbarButton } from "@/components/ToolbarButton";

export type MapLayerId = "default" | "satellite" | "topo";

export interface MapLayerOption {
  id: MapLayerId;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

export const MAP_LAYERS: MapLayerOption[] = [
  { id: "default", label: "Default", icon: Map },
  { id: "satellite", label: "Satellite", icon: Satellite },
  { id: "topo", label: "Topo", icon: Mountain },
];

export interface LayerSelectorProps {
  activeLayer: MapLayerId;
  onSelectLayer: (id: MapLayerId) => void;
}

export function LayerSelector({ activeLayer, onSelectLayer }: LayerSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (id: MapLayerId) => {
    onSelectLayer(id);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <ToolbarButton
        icon={Layers}
        label="Map layers"
        onClick={handleToggle}
        active={isOpen}
      />

      {isOpen && (
        <div
          className="
            absolute right-full top-1/2 -translate-y-1/2 mr-2
            bg-slate-900/95 backdrop-blur-md border border-slate-700/60
            rounded-lg shadow-2xl py-1 min-w-[120px] z-50
            animate-in fade-in slide-in-from-right-1 duration-150
          "
          role="menu"
          aria-label="Map layers"
          onClick={(e) => e.stopPropagation()}
        >
          {MAP_LAYERS.map((layer) => {
            const LayerIcon = layer.icon;
            const isActive = activeLayer === layer.id;

            return (
              <button
                key={layer.id}
                onClick={() => handleSelect(layer.id)}
                type="button"
                role="menuitem"
                aria-current={isActive ? "true" : undefined}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-sm
                  transition-colors duration-150
                  ${
                    isActive
                      ? "text-blue-400 bg-blue-500/10"
                      : "text-slate-300 hover:text-slate-100 hover:bg-white/5"
                  }
                `}
              >
                <LayerIcon size={14} strokeWidth={2} />
                <span>{layer.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LayerSelector;
