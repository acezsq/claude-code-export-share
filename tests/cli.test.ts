import { describe, expect, it } from "vitest";
import { isDirectCli, parseCliArgs } from "../src/cli.js";

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

describe("isDirectCli", () => {
  it("treats a symlinked bin path as the direct CLI entry", () => {
    expect(isDirectCli("file:///repo/dist/cli.js", "/usr/local/bin/claude-share", "/repo/dist/cli.js")).toBe(true);
  });
});
