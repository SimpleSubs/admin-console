import { TableTypes } from "./TableActions";
import InputTypes from "./InputTypes";
import TextTypes from "./TextTypes";

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

export const OrderOptionColumns = [
  { key: "title", title: "Title", type: TableTypes.TEXT, required: () => true },
  { key: "type", title: "Input Type", type: TableTypes.PICKER, options: Object.keys(InputTypes), displayValue: (value) => InputTypes[value], required: () => true },
  { key: "options", title: "Options", type: TableTypes.CONDITIONAL, condition: ({ type }) => getOptionsType({ inputType: type }), size: "LARGE", required: () => true },
  { key: "defaultValue", title: "Default Value(s)", type: TableTypes.CONDITIONAL, condition: getDefaultValueType, required: () => false },
  { key: "required", title: "Required", type: TableTypes.CHECKBOX, required: () => false }
];

export const UserFieldColumns = [
  { key: "title", title: "Title", type: TableTypes.TEXT, required: () => true },
  { key: "inputType", title: "Input Type", type: TableTypes.PICKER, options: ["TEXT_INPUT", "PICKER"], displayValue: (value) => InputTypes[value], required: () => true },
  { key: "textType", title: "Text Type", type: TableTypes.CONDITIONAL, condition: getTextTypeType, options: Object.keys(TextTypes), displayValue: (value) => TextTypes[value], required: () => true },
  { key: "options", title: "Options", type: TableTypes.CONDITIONAL, condition: getOptionsType, required: () => true },
  { key: "placeholder", title: "Placeholder", type: TableTypes.CONDITIONAL, condition: getPlaceholderType, required: ({ inputType }) => inputType === "TEXT_INPUT" },
  { key: "mutable", title: "Mutable", type: TableTypes.CHECKBOX, required: () => false }
];

export const OrderColumns = [
  { key: "user", title: "User", type: TableTypes.TEXT },
  { key: "date", title: "Date", type: TableTypes.DATE },
  { key: "ingredients", title: "Ingredients", type: TableTypes.ARRAY, size: "LARGE" }
];