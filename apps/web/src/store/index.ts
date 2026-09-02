import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AddressResult, AnalyzeResponse, Feature, RouteTransportMode } from '@/types/api'
import type { HazardCellCollection } from '@/types/hazard'
import type { ParcelFeature } from '@/types/parcel'
import { DEFAULT_RADIUS_KM } from '@/constants/radius'

/**
 * Global application state for the Location Intelligence web app.
 * Manages address search, analysis parameters, map visualization, and notifications.
 */

export interface Toast {
  id: string
  message: string
  type: 'error' | 'warning' | 'success' | 'info'
  dismissible?: boolean
}

export type Theme = 'light' | 'dark'

// Keep in sync with the inline anti-flash script in src/app/layout.tsx, which
// reads this same localStorage key before React hydrates.
export const THEME_STORAGE_KEY = 'li-theme'

function applyThemeClass(theme: Theme) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export interface LocationIntelligenceStore {
  // State
  selectedAddress: AddressResult | null
  radiusKm: number
  distanceMode: 'driving' | 'walking'
  analysisResult: AnalyzeResponse | null
  isAnalyzing: boolean
  visibleCategories: Set<string>
  selectedFacilities: string[] | null
  // Composite category -> weight fraction (e.g. { education: 0.4124 }).
  // null = use the server's DB-configured default weights. Same
  // non-persisted, in-memory "session" semantics as selectedFacilities.
  categoryWeights: Record<string, number> | null
  toasts: Toast[]
  activeRoute: [number, number][] | null
  selectedFeature: Feature | null
  isNavigating: boolean
  routeMode: RouteTransportMode
  navigateFrom: AddressResult | null
  navigateTo: AddressResult | null

  // Hazard map layer state -- opt-in (default hidden), separate from the
  // per-address hazard result already carried inside analysisResult.hazard
  hazardLayerVisible: boolean
  hazardCells: HazardCellCollection | null
  hoveredHazardCellId: string | null
  selectedHazardCellId: string | null

  // Cadastral parcel matched to the selected address (see useParcelAtPoint),
  // highlighted on the map in place of the plain address pin once resolved.
  parcelFeature: ParcelFeature | null

  // UI theme -- defaults to light; persisted to localStorage once the user
  // toggles it (see THEME_STORAGE_KEY / the anti-flash script in layout.tsx)
  theme: Theme

  // Actions
  setSelectedAddress: (address: AddressResult | null) => void
  setRadiusKm: (radius: number) => void
  setDistanceMode: (mode: 'driving' | 'walking') => void
  setAnalysisResult: (result: AnalyzeResponse | null) => void
  setIsAnalyzing: (isAnalyzing: boolean) => void
  toggleCategoryVisibility: (categoryId: string) => void
  clearVisibleCategories: () => void
  setSelectedFacilities: (facilityIds: string[] | null) => void
  setCategoryWeights: (weights: Record<string, number> | null) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
  setActiveRoute: (route: [number, number][] | null) => void
  setSelectedFeature: (feature: Feature | null) => void
  setIsNavigating: (isNavigating: boolean) => void
  setRouteMode: (mode: RouteTransportMode) => void
  setNavigateFrom: (address: AddressResult | null) => void
  setNavigateTo: (address: AddressResult | null) => void
  exitNavigation: () => void
  toggleHazardLayerVisible: () => void
  setHazardCells: (cells: HazardCellCollection | null) => void
  setHoveredHazardCellId: (id: string | null) => void
  setSelectedHazardCellId: (id: string | null) => void
  setParcelFeature: (feature: ParcelFeature | null) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const useLocationStore = create<LocationIntelligenceStore>()(
  persist(
    (set, get) => ({
  // Initial state
  selectedAddress: null,
  radiusKm: DEFAULT_RADIUS_KM,
  distanceMode: 'driving',
  analysisResult: null,
  isAnalyzing: false,
  visibleCategories: new Set(),
  selectedFacilities: null,
  categoryWeights: null,
  toasts: [],
  activeRoute: null,
  selectedFeature: null,
  isNavigating: false,
  routeMode: 'driving' as RouteTransportMode,
  navigateFrom: null,
  navigateTo: null,

  hazardLayerVisible: false,
  hazardCells: null,
  hoveredHazardCellId: null,
  selectedHazardCellId: null,

  parcelFeature: null,

  theme: 'light' as Theme,

  // Setters
  setSelectedAddress: (address) =>
    set({ selectedAddress: address }),

  setRadiusKm: (radius) =>
    set({ radiusKm: radius }),

  setDistanceMode: (mode) =>
    set({ distanceMode: mode }),

  setAnalysisResult: (result) =>
    set({ analysisResult: result }),

  setIsAnalyzing: (isAnalyzing) =>
    set({ isAnalyzing }),

  // Toggle category visibility on map
  toggleCategoryVisibility: (categoryId) =>
    set((state) => {
      const updated = new Set(state.visibleCategories)
      if (updated.has(categoryId)) {
        updated.delete(categoryId)
      } else {
        updated.add(categoryId)
      }
      return { visibleCategories: updated }
    }),

  clearVisibleCategories: () =>
    set({ visibleCategories: new Set() }),

  setSelectedFacilities: (facilityIds) =>
    set({ selectedFacilities: facilityIds }),

  setCategoryWeights: (weights) =>
    set({ categoryWeights: weights }),

  // Toast management
  addToast: (toast) =>
    set((state) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      return {
        toasts: [...state.toasts, { ...toast, id }],
      }
    }),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),

  clearToasts: () =>
    set({ toasts: [] }),

  setActiveRoute: (route) =>
    set({ activeRoute: route }),

  setSelectedFeature: (feature) =>
    set({ selectedFeature: feature }),

  setIsNavigating: (isNavigating) =>
    set({ isNavigating }),

  setRouteMode: (mode) =>
    set({ routeMode: mode }),

  setNavigateFrom: (address) =>
    set({ navigateFrom: address }),

  setNavigateTo: (address) =>
    set({ navigateTo: address }),

  exitNavigation: () =>
    set({
      isNavigating: false,
      selectedFeature: null,
      activeRoute: null,
      routeMode: 'driving',
      navigateFrom: null,
      navigateTo: null,
    }),

  toggleHazardLayerVisible: () =>
    set((state) => ({ hazardLayerVisible: !state.hazardLayerVisible })),

  setHazardCells: (cells) =>
    set({ hazardCells: cells }),

  setHoveredHazardCellId: (id) =>
    set({ hoveredHazardCellId: id }),

  setSelectedHazardCellId: (id) =>
    set({ selectedHazardCellId: id }),

  setParcelFeature: (feature) =>
    set({ parcelFeature: feature }),

  setTheme: (theme) => {
    applyThemeClass(theme)
    set({ theme })
  },

  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
    applyThemeClass(next)
    set({ theme: next })
  },
    }),
    {
      name: THEME_STORAGE_KEY,
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) applyThemeClass(state.theme)
      },
    },
  ),
)
