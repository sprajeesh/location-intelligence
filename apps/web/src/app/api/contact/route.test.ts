/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { POST } from "./route";

const fetchMock = jest.fn();

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/contact", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("POST /api/contact", () => {
  it("forwards the body to FastAPI with a timeout signal", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ status: "sent" }), { status: 202 }));
    const response = await post({ firstName: "Aroha" });

    expect(response.status).toBe(202);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/contact$/);
    expect(JSON.parse(init.body)).toEqual({ firstName: "Aroha" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("returns 504 when FastAPI does not answer in time", async () => {
    fetchMock.mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    const response = await post({ firstName: "Aroha" });
    expect(response.status).toBe(504);
  });

  it("returns 502 when FastAPI is unreachable", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const response = await post({ firstName: "Aroha" });
    expect(response.status).toBe(502);
  });

  it("relays upstream failures without leaking details", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ detail: "secret" }), { status: 503 }));
    const response = await post({ firstName: "Aroha" });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Failed to send message" });
  });

  it("rejects an invalid JSON body", async () => {
    const response = await post("not json");
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
