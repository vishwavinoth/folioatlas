/**
 * FolioAtlas — env parsing: dashboard imports can store blank values as "null".
 */
import { describe, test, expect } from "bun:test";
import { envValue } from "../../src/lib/env";

describe("envValue", () => {
  test("treats blank, 'null' and 'undefined' as unset", () => {
    for (const raw of ["", "   ", "null", "undefined", " null "]) {
      process.env.FA_TEST_VAR = raw;
      expect(envValue("FA_TEST_VAR")).toBeUndefined();
    }
    delete process.env.FA_TEST_VAR;
    expect(envValue("FA_TEST_VAR")).toBeUndefined();
  });

  test("returns trimmed real values", () => {
    process.env.FA_TEST_VAR = "  gsk_abc  ";
    expect(envValue("FA_TEST_VAR")).toBe("gsk_abc");
    delete process.env.FA_TEST_VAR;
  });
});
