import { clientIpHeaders } from "./clientIp"

describe("clientIpHeaders", () => {
  it("uses cf-connecting-ip when present", () => {
    const headers = new Headers({ "cf-connecting-ip": "203.0.113.5" })
    expect(clientIpHeaders(headers)).toEqual({ "X-Forwarded-Client-Ip": "203.0.113.5" })
  })

  it("falls back to the first x-forwarded-for entry, trimmed", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" })
    expect(clientIpHeaders(headers)).toEqual({ "X-Forwarded-Client-Ip": "203.0.113.9" })
  })

  it("prefers cf-connecting-ip over x-forwarded-for when both are present", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.5",
      "x-forwarded-for": "203.0.113.9",
    })
    expect(clientIpHeaders(headers)).toEqual({ "X-Forwarded-Client-Ip": "203.0.113.5" })
  })

  it("returns an empty headers object when neither header is present", () => {
    const headers = new Headers()
    expect(clientIpHeaders(headers)).toEqual({})
  })
})
