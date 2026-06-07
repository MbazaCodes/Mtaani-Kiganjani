/**
 * Data Export Utility — CSV and Excel export
 * Usage: exportToCSV(data, filename) or exportToExcel(data, filename)
 */

type Row = Record<string, unknown>;

/** Export an array of objects as a CSV file download */
export function exportToCSV(data: Row[], filename = "export"): void {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          const str = val === null || val === undefined ? "" : String(val);
          // Escape commas and quotes
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(","),
    ),
  ];
  const blob = new Blob(["\uFEFF" + csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  downloadBlob(blob, `${filename}.csv`);
}

/** Export an array of objects as an Excel-compatible HTML table */
export function exportToExcel(data: Row[], filename = "export"): void {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const tableHTML = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head><meta charset="utf-8"/></head>
    <body>
    <table border="1" style="border-collapse:collapse">
      <thead><tr>${headers.map((h) => `<th style="background:#059669;color:white;padding:8px;font-weight:bold">${h}</th>`).join("")}</tr></thead>
      <tbody>${data
        .map(
          (row) =>
            `<tr>${headers.map((h) => `<td style="padding:6px">${row[h] ?? ""}</td>`).join("")}</tr>`,
        )
        .join("")}</tbody>
    </table>
    </body></html>`;
  const blob = new Blob([tableHTML], { type: "application/vnd.ms-excel;charset=utf-8" });
  downloadBlob(blob, `${filename}.xls`);
}

/** Flatten nested objects for export (e.g. user.first_name → user_first_name) */
export function flattenForExport(
  data: Row[],
  excludeKeys: string[] = ["form_data", "payment_data", "uploaded_documents"],
): Row[] {
  return data.map((row) => {
    const flat: Row = {};
    for (const [key, val] of Object.entries(row)) {
      if (excludeKeys.includes(key)) continue;
      if (val && typeof val === "object" && !Array.isArray(val)) {
        for (const [subKey, subVal] of Object.entries(val as Row)) {
          flat[`${key}_${subKey}`] = subVal;
        }
      } else {
        flat[key] = val;
      }
    }
    return flat;
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
