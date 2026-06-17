'use client';

import { useMutation } from '@tanstack/react-query';
import { useLocationStore } from '@/store';
import { analyzeLocation, type AnalyzeRequest } from '@/services/api';
import type { AnalyzeResponse } from '@/types/api';

/**
 * useAnalyze hook
 *
 * React Query mutation for POST /api/location/analyze.
 * Handles location analysis request, updates global store state on success,
 * and dispatches error notifications via toast.
 *
 * Returns an object with:
 * - `mutate`: function to trigger the analysis (accepts AnalyzeRequest)
 * - `mutateAsync`: promise-based variant
 * - `isPending`: whether the request is in progress
 * - `isError`: whether the last request failed
 * - `error`: the error object if failed
 * - `data`: the AnalyzeResponse if successful
 *
 * Usage:
 * ```
 * const { mutate, isPending } = useAnalyze();
 * mutate({
 *   address: '123 Queen St, Auckland',
 *   lat: -36.848,
 *   lon: 174.763,
 *   radiusKm: 10,
 *   categories: ['schools', 'bus_stops'],
 *   distanceMode: 'driving',
 * });
 * ```
 */

export function useAnalyze() {
  const {
    setAnalysisResult,
    setIsAnalyzing,
    addToast,
  } = useLocationStore();

  return useMutation<AnalyzeResponse, Error, AnalyzeRequest>({
    mutationFn: analyzeLocation,

    onMutate: () => {
      // Set loading state before request starts
      setIsAnalyzing(true);
    },

    onSuccess: (data) => {
      // Update store with successful result
      setAnalysisResult(data);
      setIsAnalyzing(false);
    },

    onError: (error) => {
      // Clear loading state
      setIsAnalyzing(false);

      // Clear previous analysis result on error
      setAnalysisResult(null);

      // Determine user-friendly error message
      let errorMessage = 'Something went wrong. Please try again.';

      if (error.message.includes('API error: 429')) {
        errorMessage = 'Too many requests. Please wait a moment.';
      } else if (error.message.includes('API error: 503') ||
                 error.message.includes('API error: 502')) {
        errorMessage = 'Service temporarily unavailable.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message) {
        // Use original error message if available
        errorMessage = error.message;
      }

      // Show error toast
      addToast({
        message: errorMessage,
        type: 'error',
        dismissible: true,
      });
    },
  });
}
