import { create } from 'zustand'
import type { AddressResult, AnalyzeResponse, Feature, RouteTransportMode } from '@/types/api'

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

export interface LocationIntelligenceStore {
  // State
  selectedAddress: AddressResult | null
  radiusKm: number
  distanceMode: 'driving' | 'walking'
  analysisResult: AnalyzeResponse | null
  isAnalyzing: boolean
  visibleCategories: Set<string>
  toasts: Toast[]
  activeRoute: [number, number][] | null
  selectedFeature: Feature | null
  isNavigating: boolean
  routeMode: RouteTransportMode
  navigateFrom: AddressResult | null
  navigateTo: AddressResult | null

  // Actions
  setSelectedAddress: (address: AddressResult | null) => void
  setRadiusKm: (radius: number) => void
  setDistanceMode: (mode: 'driving' | 'walking') => void
  setAnalysisResult: (result: AnalyzeResponse | null) => void
  setIsAnalyzing: (isAnalyzing: boolean) => void
  toggleCategoryVisibility: (categoryId: string) => void
  clearVisibleCategories: () => void
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
}

export const useLocationStore = create<LocationIntelligenceStore>((set) => ({
  // Initial state
  selectedAddress: null,
  radiusKm: 5,
  distanceMode: 'driving',
  analysisResult: null,
  isAnalyzing: false,
  visibleCategories: new Set(),
  toasts: [],
  activeRoute: null,
  selectedFeature: null,
  isNavigating: false,
  routeMode: 'driving' as RouteTransportMode,
  navigateFrom: null,
  navigateTo: null,

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
}))
