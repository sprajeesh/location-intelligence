import { act, renderHook } from "@testing-library/react";
import { useLocationStore } from "@/store";
import { useCorrectionPlacement } from "./useCorrectionPlacement";

const mapEvents: { click?: (e: unknown) => void } = {};
const centre = { lat: -36.9, lng: 174.8 };
const container = document.createElement("div");
const map = {
  getContainer: jest.fn(() => container),
  getCenter: jest.fn(() => centre),
};

jest.mock("react-leaflet", () => ({
  useMap: () => map,
  useMapEvents: (handlers: { click?: (e: unknown) => void }) => {
    Object.assign(mapEvents, handlers);
  },
}));

beforeEach(() => {
  useLocationStore.setState({ correctionMode: "placing", correctionPoint: null });
  container.style.cursor = "";
});

describe("useCorrectionPlacement", () => {
  it("reports placing mode and sets the crosshair cursor", () => {
    const { result } = renderHook(() => useCorrectionPlacement());
    expect(result.current.placing).toBe(true);
    expect(container.style.cursor).toBe("crosshair");
  });

  it("sets the point from a map click", () => {
    renderHook(() => useCorrectionPlacement());
    act(() => {
      mapEvents.click?.({ latlng: { lat: -36.85, lng: 174.77 }, originalEvent: { target: document.createElement("div") } });
    });
    expect(useLocationStore.getState().correctionPoint).toEqual({ lat: -36.85, lon: 174.77 });
    expect(useLocationStore.getState().correctionMode).toBe("adding");
  });

  it("ignores clicks on the toolbar", () => {
    renderHook(() => useCorrectionPlacement());
    const toolbar = document.createElement("div");
    toolbar.setAttribute("role", "toolbar");
    const button = document.createElement("button");
    toolbar.appendChild(button);
    act(() => {
      mapEvents.click?.({ latlng: { lat: 0, lng: 0 }, originalEvent: { target: button } });
    });
    expect(useLocationStore.getState().correctionPoint).toBeNull();
    expect(useLocationStore.getState().correctionMode).toBe("placing");
  });

  it("uses the map centre when asked", () => {
    const { result } = renderHook(() => useCorrectionPlacement());
    act(() => result.current.useMapCentre());
    expect(useLocationStore.getState().correctionPoint).toEqual({ lat: centre.lat, lon: centre.lng });
  });

  it("cancels on Escape and restores the cursor", () => {
    const { unmount } = renderHook(() => useCorrectionPlacement());
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(useLocationStore.getState().correctionMode).toBe("off");
    unmount();
    expect(container.style.cursor).toBe("");
  });

  it("does nothing outside placing mode", () => {
    useLocationStore.setState({ correctionMode: "off" });
    const { result } = renderHook(() => useCorrectionPlacement());
    expect(result.current.placing).toBe(false);
    expect(container.style.cursor).toBe("");
    act(() => {
      mapEvents.click?.({ latlng: { lat: 0, lng: 0 }, originalEvent: { target: document.createElement("div") } });
    });
    expect(useLocationStore.getState().correctionPoint).toBeNull();
  });
});
