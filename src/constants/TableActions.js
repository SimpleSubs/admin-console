export const TableTypes = {
  TEXT: "TEXT",
  ARRAY: "ARRAY",
  DATE: "DATE",
  PICKER: "PICKER",
  CHECKBOX: "CHECKBOX",
  CONDITIONAL: "CONDITIONAL",
  HIDDEN: "HIDDEN"
}

export const ColumnSizes = {
  SMALL: { minWidth: 1, width: 1, maxWidth: 1 },
  MEDIUM: { minWidth: 150, width: 150, maxWidth: 150 },
  LARGE: { minWidth: 300, width: 300, maxWidth: 300 }
}

export default function getHeaderValues({ key, title, type = TableTypes.TEXT, size = "MEDIUM" }) {
  return {
    Header: title,
    accessor: key,
    type,
    size
  }
}