import { describe, it, expect } from "vitest";
import { exportToCSV, exportToExcel, flattenForExport } from "@/lib/export";

describe("exportToCSV", () => {
  it("exports data without error", () => {
    const data = [
      { name: "Juma", ward: "Kariakoo", fee: 5000 },
      { name: "Asha", ward: "Mchikichini", fee: 3000 },
    ];
    expect(() => exportToCSV(data as unknown as Record<string, unknown>[], "test")).not.toThrow();
  });
  it("handles empty array", () => {
    expect(() => exportToCSV([], "test")).not.toThrow();
  });
});

describe("exportToExcel", () => {
  it("exports data without error", () => {
    const data = [{ name: "Test", value: 123 }];
    expect(() => exportToExcel(data as unknown as Record<string, unknown>[], "test")).not.toThrow();
  });
});

describe("flattenForExport", () => {
  it("flattens nested objects", () => {
    const data = [{ name: "Juma", user: { first_name: "Juma", last_name: "Moshi" } }];
    const flat = flattenForExport(data as unknown as Record<string, unknown>[]);
    expect(flat[0]).toHaveProperty("user_first_name", "Juma");
  });
  it("excludes specified keys", () => {
    const data = [{ name: "Juma", form_data: { sensitive: true } }];
    const flat = flattenForExport(data as unknown as Record<string, unknown>[], ["form_data"]);
    expect(flat[0].form_data).toBeUndefined();
  });
});
