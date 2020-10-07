import React from "react";
import Checkbox from "./Checkbox";
import Picker from "./Picker";
import "../stylesheets/EditRowForm.css";
import { TableTypes } from "../constants/TableActions";

function validate(fields, state) {
  for (let field of fields) {
    let type = field.type === TableTypes.CONDITIONAL ? field.condition(state) : field.type;
    let value = state[field.key];
    if (field.required(state) && type !== TableTypes.HIDDEN && (!value || (value.length && value.length === 0))) {
      return false;
    }
  }
  return true;
}

function editData(data, fields) {
  let fixedData = {...data};
  for (let field of fields) {
    let type = field.type === TableTypes.CONDITIONAL ? field.condition(data) : field.type;
    if (type === TableTypes.ARRAY) {
      fixedData[field.key] = data[field.key].join(", ");
    }
  }
  return fixedData;
}

function getKey(title) {
  let wordArr = title.split(" ");
  return wordArr[0].toLowerCase() + wordArr
    .slice(1)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

function processState(data, fields) {
  let processedData = {};
  for (let field of fields) {
    let value = data[field.key];
    let type = field.type === TableTypes.CONDITIONAL ? field.condition(data) : field.type;
    if (type === TableTypes.ARRAY) {
      if (value && value.length > 0) {
        value = value.split(",").map((opt) => opt.trim()).filter((opt) => opt.length > 0);
      } else {
        value = [];
      }
    } else if (type === TableTypes.CHECKBOX) {
      value = !!value;
    } else if (type === TableTypes.TEXT) {
      value = value || "";
    }
    if (type !== TableTypes.HIDDEN) {
      processedData[field.key] = value;
    }
    processedData.key = getKey(processedData.title);
  }
  return processedData;
}

const FormInput = ({ fieldKey, type, value, setValue, id, options, displayValue }) => {
  switch (type) {
    case TableTypes.TEXT:
      return (
        <input
          type={"text"}
          placeholder={"Enter a value"}
          id={`${id}-${fieldKey}`}
          name={fieldKey}
          value={value || ""}
          onChange={setValue}
        />
      );
    case TableTypes.ARRAY:
      return (
        <input
          type={"text"}
          placeholder={"Enter comma-separated values"}
          id={`${id}-${fieldKey}`}
          name={fieldKey}
          value={value || ""}
          onChange={setValue}
        />
      );
    case TableTypes.PICKER:
      return (
        <Picker name={fieldKey} id={`${id}-${fieldKey}`} value={value || "DEFAULT"} onChange={setValue}>
          <option disabled value={"DEFAULT"}> -- select an option -- </option>
          {options.map((option, index) => (
            <option value={option} key={index}>
              {displayValue ? displayValue(option) : option}
            </option>
          ))}
        </Picker>
      );
    case TableTypes.CHECKBOX:
      return <Checkbox onChange={setValue} checked={value || false} />;
    default:
      return null;
  }
};

const FormRow = ({ fieldKey, title, type, condition, state, setState, required, ...props }) => {
  const finalType = type === TableTypes.CONDITIONAL ? condition(state) : type;
  const setValue = (event) => setState({ [fieldKey]: event.target[
    finalType === TableTypes.CHECKBOX ? "checked" : "value"
  ]});
  if (finalType === TableTypes.HIDDEN) {
    return null;
  }
  return (
    <>
      <label>
        <span>
          {title}
          {required(state) && <span className={"asterisk"}>*</span>}
        </span>
        <div className={"input-wrapper"}>
          <FormInput {...props} type={finalType} setValue={setValue} value={state[fieldKey]} fieldKey={fieldKey} />
        </div>
      </label>
      <br />
    </>
  );
};

const EditRowForm = ({ fields, id, prevData = {}, onSubmit = () => {}, open, closeModal, unfocusRow }) => {
  const [state, setFullState] = React.useState(prevData);
  const [error, setError] = React.useState(false);
  const setState = (newValue) => {
    setFullState((prevState) => ({ ...prevState, ...newValue }));
  };
  const cancel = () => {
    closeModal();
    setError(false);
    unfocusRow();
  };
  const submit = (e) => {
    e.preventDefault();
    if (!validate(fields, state)) {
      setError(true);
      return;
    }
    setError(false);
    onSubmit(processState(state, fields));
    cancel();
  };

  React.useEffect(() => setFullState(editData(prevData, fields)), [prevData, fields]);

  return (
    <div className={"edit-row-form-background " + (open ? "open" : "closed")} onClick={cancel}>
      <form className={"edit-row-form"} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        {fields.map((field) => <FormRow {...field} fieldKey={field.key} id={id} state={state} setState={setState} />)}
        <div className={"footer"}>
          <p className={"error " + (error ? "shown" : "hidden")}>Please fill out all required fields</p>
          <div className={"buttons"}>
            <input className={"styled-button cancel"} type={"button"} value={"Cancel"} onClick={cancel} />
            <input className={"styled-button"} type={"submit"} value={"Done"} />
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditRowForm;