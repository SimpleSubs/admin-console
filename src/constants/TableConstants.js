import { TableTypes } from "./TableActions";
import InputTypes, { AdminTypes } from "./InputTypes";
import TextTypes from "./TextTypes";
import { parseReadable } from "./Date";

function getDefaultValueType({ type }) {
  return type === "CHECKBOX" ?
    TableTypes.ARRAY :
    TableTypes.TEXT;
}

function getOptionsType({ inputType }) {
  return inputType !== "CHECKBOX" && inputType !== "PICKER" ?
    TableTypes.HIDDEN :
    TableTypes.ARRAY;
}

function getTextTypeType({ inputType }) {
  return inputType === "TEXT_INPUT" ?
    TableTypes.PICKER :
    TableTypes.HIDDEN;
}

function getPlaceholderType({ inputType }) {
  return inputType === "CHECKBOX" ?
    TableTypes.ARRAY :
    TableTypes.TEXT;
}

function determineAdminEditable({ user, value, focusedData }) {
  switch (value) {
    case "USER":
      return true;
    case "ADMIN":
      return user.accountType === "OWNER" || user.uid === focusedData.uid;
    case "OWNER":
      return user.uid === focusedData.uid;
    default:
      return true;
  }
}

function getRestrictedOptions({ user }) {
  if (user.accountType === "ADMIN") {
    return ["OWNER"];
  } else {
    return [];
  }
}

const sortDate = (rowA, rowB, columnId) => {
  let dateA = parseReadable(rowA.original[columnId]);
  let dateB = parseReadable(rowB.original[columnId]);
  if (dateA.isBefore(dateB)) {
    return -1;
  } else {
    return 1;
  }
}

export const PasswordField = {
  key: "password",
  type: "TEXT_INPUT",
  placeholder: "Default password",
  required: true,
  textType: "PASSWORD",
  title: "Default Password"
}

export const OrderOptionColumns = [
  { key: "title", title: "Title", type: TableTypes.TEXT, required: true },
  { key: "type", title: "Input Type", type: TableTypes.PICKER, options: Object.keys(InputTypes), displayValue: (value) => InputTypes[value], required: true },
  { key: "options", title: "Options", type: TableTypes.CONDITIONAL, condition: ({ type }) => getOptionsType({ inputType: type }), size: "LARGE", required: true },
  { key: "defaultValue", title: "Default Value(s)", type: TableTypes.CONDITIONAL, condition: getDefaultValueType, required: false },
  { key: "required", title: "Required", type: TableTypes.BOOLEAN, required: false }
];

export const UserFieldColumns = [
  { key: "title", title: "Title", type: TableTypes.TEXT, required: true },
  { key: "inputType", title: "Input Type", type: TableTypes.PICKER, options: ["TEXT_INPUT", "PICKER"], displayValue: (value) => InputTypes[value], required: true },
  { key: "textType", title: "Text Type", type: TableTypes.CONDITIONAL, condition: getTextTypeType, options: Object.keys(TextTypes), displayValue: (value) => TextTypes[value], required: true },
  { key: "options", title: "Options", type: TableTypes.CONDITIONAL, condition: getOptionsType, required: true },
  { key: "placeholder", title: "Placeholder", type: TableTypes.CONDITIONAL, condition: getPlaceholderType, required: ({ inputType }) => inputType === "TEXT_INPUT" },
  { key: "mutable", title: "Mutable", type: TableTypes.BOOLEAN, required: false }
];

export const OrderColumns = [
  { key: "user", title: "User", type: TableTypes.TEXT, required: true, editable: false },
  { key: "date", title: "Date", type: TableTypes.DATE, sortType: sortDate, required: true }
];

export const UserColumns = [
  { key: "email", title: "Email", inputType: TableTypes.TEXT, required: true },
  { key: "accountType", title: "Account Type", inputType: TableTypes.PICKER, options: Object.keys(AdminTypes), displayValue: (value) => AdminTypes[value] || AdminTypes.USER, editable: determineAdminEditable, defaultValue: "USER", required: true, restrictedOptions: getRestrictedOptions }
]