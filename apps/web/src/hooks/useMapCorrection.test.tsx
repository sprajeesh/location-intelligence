import { renderHook, act } from "@testing-library/react";
import en from "@/i18n/en.json";
import { useLocationStore } from "@/store";
import { submitMapCorrection } from "@/services/api";
import { useMapCorrection } from "./useMapCorrection";

jest.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) =>
    key.split(".").reduce<unknown>(
      (node, part) => (node as Record<string, unknown>)[part],
      (en as Record<string, unknown>)[ns],
    ),
}));
jest.mock("@/services/api", () => ({ submitMapCorrection: jest.fn() }));

const submitMock = submitMapCorrection as jest.MockedFunction<typeof submitMapCorrection>;
const payload = {
  correctionType: "remove" as const,
  targetOsmId: "node/12345",
  facilityType: "restaurants",
  lat: -36.8,
  lon: 174.7,
  reason: "closed" as const,
  website: "",
};

beforeEach(() => {
  submitMock.mockReset();
  useLocationStore.setState({ toasts: [], correctionMode: "removing", correctionRemoveTarget: null });
});

function toasts() {
  return useLocationStore.getState().toasts;
}

describe("useMapCorrection", () => {
  it("202 pending: success toast and the form closes", async () => {
    submitMock.mockResolvedValue({ status: 202, body: { id: "1", status: "pending" } });
    const { result } = renderHook(() => useMapCorrection());

    let outcome;
    await act(async () => {
      outcome = await result.current.submit(payload);
    });

    expect(outcome).toEqual({ kind: "pending" });
    expect(toasts()).toMatchObject([{ message: en.mapCorrection.toasts.pending, type: "success" }]);
    expect(useLocationStore.getState().correctionMode).toBe("off");
  });

  it("200 already_mapped: info toast and the form closes", async () => {
    submitMock.mockResolvedValue({ status: 200, body: { status: "already_mapped" } });
    const { result } = renderHook(() => useMapCorrection());

    let outcome;
    await act(async () => {
      outcome = await result.current.submit(payload);
    });

    expect(outcome).toEqual({ kind: "alreadyMapped" });
    expect(toasts()).toMatchObject([{ message: en.mapCorrection.toasts.alreadyMapped, type: "info" }]);
    expect(useLocationStore.getState().correctionMode).toBe("off");
  });

  it("200 already_removed: info toast and the form closes", async () => {
    submitMock.mockResolvedValue({ status: 200, body: { status: "already_removed" } });
    const { result } = renderHook(() => useMapCorrection());

    let outcome;
    await act(async () => {
      outcome = await result.current.submit(payload);
    });

    expect(outcome).toEqual({ kind: "alreadyRemoved" });
    expect(toasts()).toMatchObject([{ message: en.mapCorrection.toasts.alreadyRemoved, type: "info" }]);
  });

  it("422 with a field location: returns the field and leaves the form open", async () => {
    submitMock.mockResolvedValue({
      status: 422,
      body: { detail: [{ loc: ["body", "name"], msg: "too long", type: "value_error" }] },
    });
    const { result } = renderHook(() => useMapCorrection());
    useLocationStore.setState({ correctionMode: "adding" });

    let outcome;
    await act(async () => {
      outcome = await result.current.submit(payload);
    });

    expect(outcome).toEqual({ kind: "invalid", fieldErrors: ["name"], formError: false });
    expect(toasts()).toEqual([]);
    expect(useLocationStore.getState().correctionMode).toBe("adding");
  });

  it("422 without a field location (model-level rule): flags a form error", async () => {
    submitMock.mockResolvedValue({
      status: 422,
      body: { detail: [{ loc: ["body"], msg: "reason is required for remove", type: "value_error" }] },
    });
    const { result } = renderHook(() => useMapCorrection());

    let outcome;
    await act(async () => {
      outcome = await result.current.submit(payload);
    });

    expect(outcome).toEqual({ kind: "invalid", fieldErrors: [], formError: true });
  });

  it("429: returns the retry wait for the form to show", async () => {
    submitMock.mockResolvedValue({ status: 429, body: {}, retryAfterSeconds: 120 });
    const { result } = renderHook(() => useMapCorrection());

    let outcome;
    await act(async () => {
      outcome = await result.current.submit(payload);
    });

    expect(outcome).toEqual({ kind: "rateLimited", retryAfterSeconds: 120 });
    expect(toasts()).toEqual([]);
  });

  it("5xx: error toast with a Retry action that submits again with a new correlation ID", async () => {
    submitMock.mockResolvedValueOnce({ status: 503, body: {} });
    submitMock.mockResolvedValueOnce({ status: 202, body: { id: "1", status: "pending" } });
    const { result } = renderHook(() => useMapCorrection());

    let outcome;
    await act(async () => {
      outcome = await result.current.submit(payload);
    });
    expect(outcome).toEqual({ kind: "error" });
    expect(toasts()).toMatchObject([
      { message: en.mapCorrection.toasts.error, type: "error", action: { label: en.mapCorrection.toasts.retry } },
    ]);

    await act(async () => {
      toasts()[0]?.action?.onClick();
    });

    expect(submitMock).toHaveBeenCalledTimes(2);
    expect(submitMock.mock.calls[1]?.[0]).toEqual(payload);
    expect(submitMock.mock.calls[0]?.[1]).not.toEqual(submitMock.mock.calls[1]?.[1]);
  });

  it("network failure: error toast, and the payload is not shown in it", async () => {
    submitMock.mockRejectedValue(new TypeError("fetch failed"));
    const { result } = renderHook(() => useMapCorrection());
    const addressPayload = {
      correctionType: "add" as const,
      facilityType: "restaurants",
      lat: -36.848,
      lon: 174.763,
      reporterEmail: "person@example.com",
      website: "",
    };

    let outcome;
    await act(async () => {
      outcome = await result.current.submit(addressPayload);
    });

    expect(outcome).toEqual({ kind: "error" });
    const messages = toasts().map((toast) => toast.message).join(" ");
    expect(messages).toBe(en.mapCorrection.toasts.error);
    expect(messages).not.toContain("person@example.com");
  });
});
