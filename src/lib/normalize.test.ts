import { describe, it, expect } from "vitest";
import { dedupKey, inferSeniority, normalizeText } from "./normalize";

describe("dedupKey", () => {
  it("collapses re-lists of the same role at the same company", () => {
    const a = dedupKey("Acme Inc.", "Senior DevOps Engineer (Remote)");
    const b = dedupKey("Acme", "Senior DevOps Engineer - Remote");
    expect(a).toBe(b);
  });

  it("keeps genuinely different seniorities distinct", () => {
    const senior = dedupKey("Acme", "Senior DevOps Engineer");
    const plain = dedupKey("Acme", "DevOps Engineer");
    expect(senior).not.toBe(plain);
  });

  it("distinguishes different companies", () => {
    expect(dedupKey("Acme", "DevOps Engineer")).not.toBe(
      dedupKey("Globex", "DevOps Engineer")
    );
  });
});

describe("inferSeniority", () => {
  it.each([
    ["DevOps Intern", "intern"],
    ["Junior Cloud Engineer", "junior"],
    ["DevOps Engineer", "mid"],
    ["Senior SRE", "senior"],
    ["Principal Site Reliability Engineer", "lead"],
    ["Director of SRE", "lead"],
  ])("classifies %s as %s", (title, expected) => {
    expect(inferSeniority(title)).toBe(expected);
  });
});

describe("normalizeText", () => {
  it("lowercases, strips punctuation, and drops company suffixes", () => {
    expect(normalizeText("Acme Technologies, Inc.")).toBe("acme");
  });
});
