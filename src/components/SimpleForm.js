import React from "react";
import Checkbox from "./Checkbox";
import Picker from "./Picker";
import "../stylesheets/Forms.scss";
import { TableTypes } from "../constants/TableActions";
import moment from "moment";

function isRequired(required, state) {
  if (typeof required === "function") {
    return required(state);
  } else {
    return required;
  }
}

function isEditable(editable, value, focusedData, params) {
  if (typeof editable === "function") {
    return editable({ ...params, focusedData, value });
  } else {
    return editable;
  }
}

function validate(fields, state) {
  for (let field of fields) {
    let type = field.type === TableTypes.CONDITIONAL ? field.condition(state) : field.type;
    let value = state[field.key];
    if (isRequired(field.required, state) && type !== TableTypes.HIDDEN && (!value || (value.length && value.length === 0))) {
      return false;
    }
  }
  return true;
}

function editData(data, fields) {
  let fixedData = {...data};
  for (let field of fields) {
    let type = field.type === TableTypes.CONDITIONAL ? field.condition(data) : field.type;
    if (type === TableTypes.ARRAY && data[field.key]) {
      fixedData[field.key] = data[field.key].join(", ");
    }
  }
  return fixedData;
}

function getKey() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function processState(data, fields, key) {
  let processedData = {};
  for (let field of fields) {
    let value = data[field.key];
    let type = field.type === TableTypes.CONDITIONAL ? field.condition(data) : field.type;
    let required = isRequired(field.required, data);
    switch (type) {
      case TableTypes.ARRAY:
        if (value && value.length > 0) {
          value = value.split(",").map((opt) => opt.trim()).filter((opt) => opt.length > 0);
        } else {
          value = field.defaultValue || [];
        }
        break;
      case TableTypes.BOOLEAN:
        value = (typeof value === "boolean") ? value : !!field.defaultValue;
        break;
      case TableTypes.TEXT:
        value = value || field.defaultValue || (!required ? "" : null);
        break;
      case TableTypes.DATE:
        if ((!value && !required) || moment(value).isBefore(moment(), "day")) {
          value = field.defaultValue || moment().format("MM-DD-YYYY");
        }
        break;
      case TableTypes.PICKER:
        value = value || field.defaultValue || (!required ? "" : null);
        break;
      default:
        break;
    }
    if (type !== TableTypes.HIDDEN) {
      processedData[field.key] = value;
    }
    processedData.key = key || getKey();
  }
  return processedData;
}

const FormInput = ({ fieldKey, type, value, setValue, id, options, displayValue, extraParams, prevData, editable = true, defaultValue, restrictedOptions = () => [] }) => {
  const disabled = !isEditable(editable, value, prevData, extraParams);
  switch (type) {
    case TableTypes.TEXT:
      return (
        <input
          type={"text"}
          placeholder={"Enter a value"}
          id={`${id}-${fieldKey}`}
          name={fieldKey}
          value={value || defaultValue || ""}
          onChange={setValue}
          disabled={disabled}
        />
      );
    case TableTypes.DATE:
      return (
        <input
          type={"date"}
          id={`${id}-${fieldKey}`}
          name={fieldKey}
          value={value || defaultValue || ""}
          onChange={setValue}
          min={moment().format("YYYY-MM-DD")}
          disabled={disabled}
        />
      )
    case TableTypes.ARRAY:
      return (
        <input
          type={"text"}
          placeholder={"Enter comma-separated values"}
          id={`${id}-${fieldKey}`}
          name={fieldKey}
          value={value || defaultValue?.join(", ") || ""}
          onChange={setValue}
          disabled={disabled}
        />
      );
    case TableTypes.PICKER:
      const restricted = restrictedOptions(extraParams);
      return (
        <Picker
          name={fieldKey}
          id={`${id}-${fieldKey}`}
          value={options.includes(value) ? value : (options.includes(defaultValue) ? defaultValue : "DEFAULT")}
          onChange={setValue}
          disabled={disabled}
        >
          <option disabled value={"DEFAULT"}> -- select an option -- </option>
          {options.map((option, index) => (
            <option value={option} key={index} disabled={restricted.includes(option)}>
              {displayValue ? displayValue(option) : option}
            </option>
          ))}
        </Picker>
      );
    case TableTypes.BOOLEAN:
      return <Checkbox onChange={setValue} disabled={disabled} checked={value || defaultValue || false} />;
    default:
      return null;
  }
};

const FormRow = ({ fieldKey, title, type, condition, state, setState, required, ...props }) => {
  const finalType = type === TableTypes.CONDITIONAL ? condition(state) : type;
  const setValue = (event) => setState({ [fieldKey]: event.target[
      finalType === TableTypes.BOOLEAN ? "checked" : "value"
      ]});
  if (finalType === TableTypes.HIDDEN) {
    return null;
  }
  return (
    <>
      <label>
        <span>
          {title}
          {isRequired(required, state) && <span className={"asterisk"}>*</span>}
        </span>
        <div className={"input-wrapper"}>
          <FormInput {...props} type={finalType} setValue={setValue} value={state[fieldKey]} fieldKey={fieldKey} />
        </div>
      </label>
      <br />
    </>
  );
};

const SimpleForm = ({ fields, id, prevData = {}, onSubmit = () => {}, extraParams = {}, buttonTitles = {}, onCancel = () => {}, className = "", ...props }) => {
  const [state, setFullState] = React.useState(prevData);
  const [error, setError] = React.useState(false);

  const setState = (newValue) => {
    setFullState((prevState) => ({ ...prevState, ...newValue }));
  };

  const cancel = () => {
    onCancel();
    setError(false);
    setFullState(prevData);
  };

  const submit = (e) => {
    e.preventDefault();
    let processedState = processState(state, fields, prevData.key);
    if (!validate(fields, processedState)) {
      setError(true);
      return;
    }
    setError(false);
    onSubmit(processedState);
  };

  React.useEffect(() => setFullState(editData(prevData, fields)), [prevData, fields]);

  return (
    <form
      {...props}
      className={"simple-form " + className}
      onClick={(e) => e.stopPropagation()}
      onSubmit={submit}
    >
      {fields.map((field) => (
        <FormRow
          {...field}
          fieldKey={field.key}
          id={id}
          state={state}
          setState={setState}
          extraParams={extraParams}
          prevData={prevData}
        />
      ))}
      <div className={"footer"}>
        <p className={"error " + (error ? "shown" : "hidden")}>Please fill out all required fields</p>
        <div className={"buttons"}>
          <input
            className={"styled-button cancel"}
            type={"button"}
            value={buttonTitles.cancel || "Reset"}
            onClick={cancel}
          />
          <input className={"styled-button"} type={"submit"} value={buttonTitles.done || "Done"} />
        </div>
      </div>
    </form>
  );
};

export default SimpleForm;