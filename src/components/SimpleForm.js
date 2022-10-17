import React from "react";
import Checkbox from "./Checkbox";
import Picker from "./Picker";
import CheckboxList from "./CheckboxList";
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
    if (
      isRequired(field.required, state)
      && type !== TableTypes.HIDDEN
      && (!value || (value.length && value.length === 0))
    ) {
      return false;
    }
  }
  return true;
}

function getKey() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function processState(data, fields, key, custom) {
  let processedData = {};
  for (let field of fields) {
    if (field.key === "key") {
      continue;
    }
    let value = data[field.key];
    let type = field.type === TableTypes.CONDITIONAL ? field.condition(data) : field.type;
    let required = isRequired(field.required, data);
    switch (type) {
      case TableTypes.ARRAY:
        if (custom) {
          if (value && value.length > 0) {
            // value will be a string if user is creating a field; otherwise it will be array
            // TODO: determine whether or not user is editing/creating beforehand (this is a hack-y solution)
            if (typeof value === "string") {
              value = value.split(",").map((opt) => opt.trim()).filter((opt) => opt.length > 0);
            }
          } else {
            value = field.defaultValue || [];
          }
        } else {
          value = value || [];
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

const FormInput = ({ fieldKey, type, value, setValue, id, options = [], displayValue, extraParams, prevData, editable = true, defaultValue, custom, restrictedOptions = () => [] }) => {
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
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
        />
      );
    case TableTypes.NUMBER:
      return (
        <input
          type={"number"}
          placeholder={"Enter a number"}
          id={`${id}-${fieldKey}`}
          name={fieldKey}
          value={value || defaultValue || ""}
          onChange={(e) => setValue(e.target.value)}
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
          onChange={(e) => setValue(e.target.value)}
          min={moment().format("YYYY-MM-DD")}
          disabled={disabled}
        />
      )
    case TableTypes.ARRAY:
      if (custom) {
        return (
          <input
            type={"text"}
            placeholder={"Enter comma-separated values"}
            id={`${id}-${fieldKey}`}
            name={fieldKey}
            value={value || defaultValue?.join(", ") || ""}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled}
          />
        );
      } else {
        return (
          <CheckboxList
            id={`${id}-${fieldKey}`}
            checkedValues={value || []}
            options={options}
            onChange={setValue}
          />
        )
      }
    case TableTypes.PICKER:
      const restricted = restrictedOptions(extraParams);
      return (
        <Picker
          name={fieldKey}
          id={`${id}-${fieldKey}`}
          value={options.includes(value) ? value : (options.includes(defaultValue) ? defaultValue : "DEFAULT")}
          onChange={(e) => setValue(e.target.value)}
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
      return (
        <Checkbox
          onChange={(e) => setValue(e.target.checked)}
          disabled={disabled}
          checked={value || defaultValue || false}
        />
      );
    case TableTypes.WEEK_ARRAY:
      return (
        <div className={"week-array"}>
          {moment.weekdays().map((day, i) => {
            let fieldValue;
            if (!value || !value[i]) {
              fieldValue = defaultValue?.join(", ") || "";
            } else if (typeof value[i] === "string") {
              fieldValue = value[i];
            } else {
              fieldValue = Object.values(value[i]).join(", ");
            }
            return (
              <input
                type={"text"}
                key={day}
                placeholder={"Enter comma-separated values for " + day}
                id={`${id}-${fieldKey}-${i}`}
                name={fieldKey + "-" + i}
                value={fieldValue}
                onChange={(e) => {
                  let newValue = Array.isArray(value) ? [...value] : (new Array(7)).fill("");
                  newValue[i] = e.target.value;
                  setValue(newValue);
                }}
                disabled={disabled}
              />
            )
          })}
        </div>
      )
    default:
      return null;
  }
};

const VariableLabel = ({ isCheckboxList, children }) => (
  isCheckboxList
    ? <div className={"align-top"}>{children}</div>
    : <label>{children}</label>
);

const FormRow = ({ fieldKey, title, type, condition, state, setState, required, custom, ...props }) => {
  const finalType = type === TableTypes.CONDITIONAL ? condition(state) : type;
  const setValue = (value) => setState({ [fieldKey]: value });
  if (finalType === TableTypes.HIDDEN) {
    return null;
  }
  const value = (state[fieldKey] && finalType === TableTypes.ARRAY && Array.isArray(state[fieldKey]))
    ? state[fieldKey].join(", ")
    : state[fieldKey];
  return (
    <>
      <VariableLabel isCheckboxList={!custom && type === TableTypes.ARRAY}>
        <span>
          {title}
          {isRequired(required, state) && <span className={"asterisk"}>*</span>}
        </span>
        <div className={"input-wrapper"}>
          <FormInput
            {...props}
            custom={custom}
            type={finalType}
            setValue={setValue}
            value={value}
            fieldKey={fieldKey}
          />
        </div>
      </VariableLabel>
      <br />
    </>
  );
};

const SimpleForm = ({ fields, id, prevData = {}, onSubmit = () => {}, extraParams = {}, buttonTitles = {}, onCancel = () => {}, className = "", custom = false, ...props }) => {
  const [state, setFullState] = React.useState({});
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
    let processedState = processState(state, fields, prevData.key, custom);
    if (!validate(fields, processedState)) {
      setError(true);
      return;
    }
    setError(false);
    onSubmit(processedState);
  };

  React.useEffect(() => setFullState(prevData), [prevData]);

  return (
    <form
      {...props}
      className={"simple-form " + className}
      onClick={(e) => e.stopPropagation()}
      onSubmit={submit}
    >
      {fields.map((field, i) => (
        <FormRow
          {...field}
          fieldKey={field.key}
          id={id}
          key={i}
          state={state}
          setState={setState}
          extraParams={extraParams}
          prevData={prevData}
          custom={custom}
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