import { describe, it, expect } from "vitest";
import {
  cn,
  formatDate,
  formatCurrency,
  formatFullName,
  getInitials,
  truncate,
} from "@/lib/utils";

describe("cn (classname merger)", () => {
  it("merges class names", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });
  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
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
    expect(formatDate("")).toBe("");
  });
});

describe("formatCurrency", () => {
  it("formats number with commas", () => {
    const result = formatCurrency(15000);
    expect(result).toContain("15,000");
  });
});

describe("formatFullName", () => {
  it("combines first and last name", () => {
    const user = { first_name: "Juma", last_name: "Moshi" } as any;
    expect(formatFullName(user)).toBe("Juma Moshi");
  });
  it("handles missing names", () => {
    expect(formatFullName({} as any)).toBe("N/A");
  });
});

describe("getInitials", () => {
  it("extracts initials", () => {
    const user = { first_name: "Juma", last_name: "Moshi" } as any;
    expect(getInitials(user)).toBe("JM");
  });
});

describe("truncate", () => {
  it("truncates long strings", () => {
    expect(truncate("Hello World", 5)).toBe("Hello...");
  });
  it("leaves short strings intact", () => {
    expect(truncate("Hi", 10)).toBe("Hi");
  });
});
