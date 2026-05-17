import { describe, expect, it } from "vitest";
import { parseCliArgs } from "../src/cli.js";

describe("parseCliArgs", () => {
  it("parses publish current with yes", () => {
    expect(parseCliArgs(["publish", "--current", "--yes"])).toMatchObject({
      command: "publish",
      current: true,
      yes: true,
    });
  });

  it("parses export session with output path", () => {
    expect(parseCliArgs(["export", "--session", "s1", "--out", "share"])).toMatchObject({
      command: "export",
      sessionId: "s1",
      out: "share",
    });
  });
});
