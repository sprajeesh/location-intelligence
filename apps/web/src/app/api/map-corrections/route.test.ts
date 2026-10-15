/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { POST } from "./route";

const fetchMock = jest.fn();

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new NextRequest("http://localhost/api/map-corrections", {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("POST /api/map-corrections", () => {
  it("forwards the body and trace and client IP headers", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "x", status: "pending" }), { status: 202 }));
    const response = await post(
      { correctionType: "remove", targetOsmId: "node/1", reason: "closed" },
      {
        "X-Request-ID": "req-1",
        "X-Correlation-ID": "corr-1",
        "cf-connecting-ip": "203.0.113.7",
      },
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ id: "x", status: "pending" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/map-corrections$/);
    expect(JSON.parse(init.body)).toEqual({ correctionType: "remove", targetOsmId: "node/1", reason: "closed" });
    expect(init.headers).toMatchObject({
      "X-Request-ID": "req-1",
      "X-Correlation-ID": "corr-1",
      "X-Forwarded-Client-Ip": "203.0.113.7",
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("relays 200 already-mapped responses verbatim", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ status: "already_mapped" }), { status: 200 }));
    const response = await post({ correctionType: "add" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "already_mapped" });
  });

  it("relays 422 field errors verbatim", async () => {
    const detail = [{ loc: ["body", "name"], msg: "too long", type: "value_error" }];
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ detail }), { status: 422 }));
    const response = await post({ correctionType: "add" });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ detail });
  });

  it("relays 429 with Retry-After", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: "rate limited" }), {
        status: 429,
        headers: { "Retry-After": "120" },
      }),
    );
    const response = await post({ correctionType: "add" });
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("120");
  });

  it("returns 504 when FastAPI does not answer in time", async () => {
    fetchMock.mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    const response = await post({ correctionType: "add" });
    expect(response.status).toBe(504);
  });

  it("returns 502 when FastAPI is unreachable", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const response = await post({ correctionType: "add" });
    expect(response.status).toBe(502);
  });

  it("rejects an invalid JSON body without calling FastAPI", async () => {
    const response = await post("not json");
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
