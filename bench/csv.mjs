// Shared CSV reader/writer. Fields are quoted; blank lines separate metric and environment
// blocks.

const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export function toCsv(columns, rows) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((c) => csvCell(row[c])).join(",")),
  ].join("\n");
}

// Returns one array of row objects per blank-line-separated block.
export function parseCsvBlocks(text) {
  const blocks = [];
  let rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  const endField = () => { row.push(field); field = ""; };
  const endRow = () => {
    endField();
    if (row.length === 1 && row[0] === "") {
      if (rows.length) blocks.push(rows);
      rows = [];
    } else {
      rows.push(row);
    }
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") endField();
    else if (c === "\n") endRow();
    else if (c !== "\r") field += c;
  }
  if (field || row.length) endRow();
  if (rows.length) blocks.push(rows);

  return blocks.map(([header, ...body]) =>
    body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])))
  );
}
