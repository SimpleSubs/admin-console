import React from "react";
import Picker from "./Picker";

const TimeField = ({ formName, fieldName, state = {}, setState, showError }) => {
  const setHours = (e) => setState({ ...state, hours: parseInt(e.target.value) });
  const setMinutes = (e) => setState({ ...state, minutes: parseInt(e.target.value) });
  const setAMPM = (e) => setState({...state, isAM: e.target.value === "am"});
  return (
    <div className={"time-field"}>
      <div>
        <label>
          <span>Hours</span>
          <input
            type={"number"}
            placeholder={"Hour"}
            id={`${formName}-${fieldName}-hour`}
            name={"hour"}
            value={isNaN(state.hours) ? "" : state.hours}
            onChange={setHours}
          />
        </label>
        <p>:</p>
        <label>
          <span>Minutes</span>
          <input
            type={"number"}
            placeholder={"Minute"}
            id={`${formName}-${fieldName}-minute`}
            name={"minute"}
            value={(!isNaN(state.minutes) && state.minutes < 10 ? "0" : "") + state.minutes}
            onChange={setMinutes}
          />
        </label>
        <Picker name={"amPM"} id={`${formName}-${fieldName}-amPM`} value={state.isAM ? "am" : "pm"} onChange={setAMPM}>
          <option value={"am"}>AM</option>
          <option value={"pm"}>PM</option>
        </Picker>
      </div>
      <p className={"error " + (showError ? "shown" : "hidden")}>Please enter a valid time</p>
    </div>
  )
};

export default TimeField