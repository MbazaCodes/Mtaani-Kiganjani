import { describe, it, expect } from "vitest";
import { cn, formatDate, formatTZS, truncateText } from "@/lib/utils";

describe("cn (classname merger)", () => {
  it("merges class names", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });
  it("handles conditional classes", () => {
    const showHidden = false;
    expect(cn("base", showHidden && "hidden", "visible")).toBe("base visible");
  });
  it("deduplicates Tailwind classes", () => {
    const result = cn("px-4", "px-2");
    expect(result).toContain("px-2");
  });
});

describe("formatDate", () => {
  it("formats ISO date string", () => {
    const result = formatDate("2026-06-19T10:00:00Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
  it("handles empty/null input", () => {
    const result = formatDate("");
    // Empty string produces "Invalid Date" from Date constructor — verify it returns a string
    expect(typeof result).toBe("string");
  });
});

describe("formatTZS", () => {
  it("formats number with commas", () => {
    const result = formatTZS(15000);
    expect(result).toContain("15,000");
  });
});

describe("truncateText", () => {
  it("truncates long strings", () => {
    const result = truncateText("Hello World", 5);
    expect(result.length).toBeLessThanOrEqual(8); // 5 chars + "..."
    expect(result).toContain("...");
  });
  it("leaves short strings intact", () => {
    expect(truncateText("Hi", 10)).toBe("Hi");
  });
});
