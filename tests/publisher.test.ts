import { describe, expect, it } from "vitest";
import { parsePinmeOutput } from "../src/publisher";

describe("parsePinmeOutput", () => {
  it("extracts an https URL and CID from PinMe output", () => {
    const parsed = parsePinmeOutput("CID: bafyabc123\nURL: https://bafyabc123.ipfs.pinme.dev\n");

    expect(parsed.url).toBe("https://bafyabc123.ipfs.pinme.dev");
    expect(parsed.cid).toBe("bafyabc123");
  });

  it("returns undefined fields when output has no URL", () => {
    expect(parsePinmeOutput("login required")).toEqual({});
  });
});
