import React from "react";
import Checkbox from "./Checkbox";

const CheckboxList = ({ checkedValues, options, onChange }) => {
  const onCheckboxClick = (value, e) => {
    if (e.target.checked) {
      onChange([...checkedValues, value]);
    } else {
      onChange(checkedValues.filter((val) => val !== value));
    }
  }
  return (
    <div className={"checkbox-list"}>
      {options.map((option) => {
        let checked = checkedValues.includes(option);
        return (
          <label className={"checkbox-wrapper"} key={option}>
            <Checkbox onChange={(e) => onCheckboxClick(option, e)} checked={checked} />
            {option}
          </label>
        )
      })}
    </div>
  )
};

export default CheckboxList;