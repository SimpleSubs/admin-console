import { TableTypes } from "./TableActions";

const DomainFields = [
  {
    key: "name",
    title: "Name",
    editable: true,
    type: TableTypes.TEXT,
    textType: "PLAIN"
  },
  {
    key: "code",
    title: "Code",
    editable: false,
    type: TableTypes.TEXT,
    textType: "PLAIN"
  }
];

export default DomainFields;