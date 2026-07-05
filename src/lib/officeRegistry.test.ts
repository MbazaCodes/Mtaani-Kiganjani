import { describe, it, expect } from "vitest";
import { parseOfficeCSV, buildHierarchyTree } from "@/lib/officeRegistry";

describe("parseOfficeCSV", () => {
  it("parses valid CSV with headers", () => {
    const csv = `office_type,name,region,district,ward
ward,Kariakoo,Dar es Salaam,Ilala,Kariakoo
mtaa,Mchikichini,Dar es Salaam,Ilala,Kariakoo`;
    const rows = parseOfficeCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].office_type).toBe("ward");
    expect(rows[0].name).toBe("Kariakoo");
    expect(rows[1].office_type).toBe("mtaa");
  });
  it("returns empty for header-only CSV", () => {
    expect(parseOfficeCSV("office_type,name")).toHaveLength(0);
  });
  it("returns empty for empty input", () => {
    expect(parseOfficeCSV("")).toHaveLength(0);
  });
  it("handles quoted fields with commas", () => {
    const csv = `office_type,name,region
ward,"Dar es Salaam Central",Dar es Salaam`;
    const rows = parseOfficeCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Dar es Salaam Central");
  });
});

describe("buildHierarchyTree", () => {
  it("builds flat list into tree", () => {
    const offices = [
      { id: "1", parent_id: null, name: "Regional" },
      { id: "2", parent_id: "1", name: "District" },
      { id: "3", parent_id: "2", name: "Ward" },
    ] as unknown as import("@/lib/officeRegistry").Office[];
    const tree = buildHierarchyTree(offices);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].children).toHaveLength(1);
  });
  it("roots orphaned nodes", () => {
    const offices = [
      { id: "1", parent_id: "999", name: "Orphan" },
    ] as unknown as import("@/lib/officeRegistry").Office[];
    const tree = buildHierarchyTree(offices);
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe("Orphan");
  });
});
