import { TableTypes } from "./TableActions";

const DomainFields = [
  {
    key: "name",
    title: "Name",
    required: true,
    editable: true,
    type: TableTypes.TEXT,
    textType: "PLAIN"
  },
  {
    key: "code",
    title: "Code",
    required: true,
    editable: false,
    type: TableTypes.TEXT,
    textType: "PLAIN"
  }
];

export default DomainFields;