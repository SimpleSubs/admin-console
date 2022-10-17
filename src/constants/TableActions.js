export const TableTypes = {
  TEXT: "TEXT_INPUT",
  NUMBER: "NUMBER_INPUT",
  ARRAY: "CHECKBOX",
  WEEK_ARRAY: "WEEK_ARRAY",
  DATE: "DATE",
  PICKER: "PICKER",
  BOOLEAN: "BOOLEAN",
  CONDITIONAL: "CONDITIONAL",
  HIDDEN: "HIDDEN"
};

export const ColumnSizes = {
  SMALL: { minWidth: 1, width: 1, maxWidth: 1 },
  MEDIUM: { minWidth: 150, width: 150, maxWidth: 150 },
  LARGE: { minWidth: 300, width: 300, maxWidth: 300 }
};

export default function getHeaderValues({ key, title, type = TableTypes.TEXT, size = "MEDIUM" }) {
  return {
    Header: title,
    accessor: key,
    type,
    size
  }
}

export function getTableValue(data = {}, key) {
  if (!data[key]) {
    return "";
  } else if (typeof data[key] === "string") {
    return '"' + data[key] + '"';
  } else {
    return '"' + data[key].join(", ") + '"';
  }
}

export function download(rows, name) {
  let csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
  let encodedUri = encodeURI(csvContent);
  let link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${name}.csv`);
  document.body.appendChild(link); // Required for FF
  link.click();
}