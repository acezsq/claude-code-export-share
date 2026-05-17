import { describe, expect, it } from "vitest";
import * as api from "../src/index.js";

describe("package exports", () => {
  it("exports the core modules", () => {
    expect(Object.keys(api).sort()).toEqual([
      "DEFAULT_REDACTION_RULES",
      "encodeClaudeProjectPath",
      "exportStaticSite",
      "findTranscript",
      "parsePinmeOutput",
      "parseTranscript",
      "redactTranscript",
    ]);
  });
});
