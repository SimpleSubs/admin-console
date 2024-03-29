import React from "react";
import moment from "moment";
import TimeField from "./TimeField";
import Picker from "./Picker";
import CheckboxList from "./CheckboxList";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faTrashAlt, faPlusSquare } from "@fortawesome/free-regular-svg-icons";
// import { ISO_FORMAT, toStandard } from "../constants/Date";
import "../stylesheets/Forms.scss";

const ScheduleField = ({ formName, state = (new Array(7)).fill(null), setState, defaultTime = { hours: 7, minutes: 30, isAM: true }, useNestedTime = false, useDependent = false, userFieldOptions = [] }) => {
  const weekdays = moment.weekdays();
  const toggleWeekday = (day) => {
    let newState = [...state];
    newState[day] = state[day] ? null : createNested("default");
    setState(newState);
  };
  const setDefaultCustom = (e, day) => {
    let newState = [...state];
    if (e.target.value === "default") {
      newState[day] = createNested("default");
    } else {
      newState[day] = createNested(defaultTime);
    }
    setState(newState);
  }
  const setCustomTime = (value, day) => {
    let newState = [...state];
    if (useNestedTime) {
      newState[day] = newState[day] || {}
      newState[day].time = value;
    } else {
      newState[day] = value;
    }
    setState(newState);
  }
  const setValidFields = (value, day) => {
    let newState = [...state];
    newState[day] = newState[day] || {};
    if (value.length === userFieldOptions.length) {
      newState[day].validFields = null;
    } else {
      newState[day].validFields = value;
    }
    setState(newState);
  }
  const extractNested = (status) => (
    useNestedTime && status ?
      status.time :
      status
  );
  const createNested = (value) => useNestedTime ? { time: value } : value;
  return (
    <form className={"schedule-field"}>
      <table>
        <tbody>
          {state.map((status, i) => {
            const nestedTime = extractNested(status);
            return (
              <tr
                className={`${nestedTime ? "selected" : ""} ${nestedTime !== "default" ? "custom" : ""}`}
                key={i}
              >
                <td>
                  <input
                    className={"weekday-selector"}
                    type={"button"}
                    value={weekdays[i][0].toUpperCase()}
                    name={weekdays[i]}
                    onClick={() => toggleWeekday(i)}
                  />
                </td>
                <td className={"hide-unselected"}>
                  <Picker
                    value={nestedTime === "default" ? "default" : "custom"}
                    onChange={(e) => setDefaultCustom(e, i)}
                  >
                    <option value={"default"}>Use default</option>
                    <option value={"custom"}>Custom</option>
                  </Picker>
                </td>
                <td className={"hide-unselected hide-default"}>
                  <TimeField
                    formName={formName}
                    fieldName={weekdays[i]}
                    setState={(value) => setCustomTime(value, i)}
                    state={nestedTime && nestedTime !== "default" ? nestedTime : {}}
                    showError={false}
                  />
                </td>
                {useDependent && (
                  <td className={"hide-unselected dependents-list"}>
                    <span>Apply for:</span>
                    <CheckboxList
                      checkedValues={state[i]?.validFields || userFieldOptions}
                      options={userFieldOptions}
                      onChange={(checked) => setValidFields(checked, i)}
                    />
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </form>
  );
};

// const Holidays = ({ holidays = [], addHoliday, removeHoliday }) => {
//   const [inputState, setInputState] = React.useState("");
//   const [showError, setErrorShown] = React.useState(false);
//
//   const validateDate = (e) => {
//     e.preventDefault();
//     const dateValue = moment(inputState);
//     const isoDate = dateValue.isValid() ? dateValue.format(ISO_FORMAT) : null;
//     if (dateValue.isValid() && dateValue.isSameOrAfter(moment(), "day") && !holidays.includes(isoDate)) {
//       setErrorShown(false);
//       addHoliday(isoDate);
//       setInputState("");
//     } else {
//       setErrorShown(true);
//     }
//   }
//
//   return (
//     <div className={"holidays extra-field"}>
//       <span>Holidays</span>
//       <table className={"holiday-table"}>
//         <tbody>
//           {holidays.length > 0 && holidays.map((date) => (
//             <tr key={date}>
//               <td className={"date"}>{toStandard(date)}</td>
//               <td>
//                 <button onClick={() => removeHoliday(date)}>
//                   <FontAwesomeIcon icon={faTrashAlt} />
//                 </button>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//       <div>
//         <form className={"inputs-container"} onSubmit={validateDate}>
//           <input
//             type={"date"}
//             placeholder={"Enter a date"}
//             value={inputState}
//             onChange={(e) => setInputState(e.target.value)}
//           />
//           <button type={"submit"}>
//             <FontAwesomeIcon icon={faPlusSquare} />
//           </button>
//         </form>
//         <p className={"error " + (showError ? "shown" : "hidden")}>Please enter a unique, valid date</p>
//       </div>
//     </div>
//   );
// };

export const LunchSchedule = ({ setLunchSchedule, lunchSchedule = {}, userFields = [] }) => {
  const [state, setState] = React.useState(lunchSchedule);
  const formName = "lunch-schedule";
  // const addHoliday = (date) => {
  //   const newHolidays = [...(state.holidays || []), date];
  //   newHolidays.sort()
  //   setState({
  //     ...state,
  //     holidays: newHolidays
  //   });
  // };
  // const removeHoliday = (date) => {
  //   setState({
  //     ...state,
  //     holidays: (state.holidays || []).filter((holiday) => holiday !== date)
  //   });
  // }

  React.useEffect(() => setState(lunchSchedule), [lunchSchedule]);

  return (
    <div className={"setting-form"}>
      <h3>Lunch Schedule</h3>
      <div className={"schedule-form"}>
        <div className={"extra-fields-container"}>
          {/*<Holidays holidays={state.holidays} addHoliday={addHoliday} removeHoliday={removeHoliday} />*/}
          <form className={"extra-field"}>
            <span>Print Time</span>
            <TimeField
              formName={formName}
              fieldName={"default-time"}
              setState={(value) => setState({ ...state, defaultTime: value })}
              state={state.defaultTime}
              showError={false}
            />
          </form>
          <form className={"extra-field"}>
            <span>Dependent On</span>
            <Picker
              value={state.dependent || ""}
              onChange={(e) => setState({
                ...state,
                dependent: e.target.value.length > 0 ? e.target.value : null,
                schedule: state.schedule.map((day) => day?.validFields ? { ...day, validFields: null } : day)
              })}
            >
              <option value={""}>None</option>
              {userFields
                .filter(({ inputType }) => inputType === "PICKER")
                .map(({ key, title }) => <option value={key} key={key}>{title}</option>)}
            </Picker>
          </form>
        </div>
        <ScheduleField
          formName={formName}
          state={state.schedule}
          setState={(value) => setState({ ...state, schedule: value })}
          defaultTime={state.defaultTime}
          useNestedTime
          useDependent={!!state.dependent}
          userFieldOptions={userFields.find(({ key }) => state.dependent === key)?.options}
        />
        <div className={"submit-buttons"}>
          <input
            type={"button"}
            className={"styled-button cancel"}
            value={"Reset"}
            onClick={() => setState(lunchSchedule)}
          />
          <input
            type={"submit"}
            className={"styled-button"}
            value={"Update"}
            onClick={() => setLunchSchedule(state)}
          />
        </div>
      </div>
    </div>
  );
};

export const OrderSchedule = ({ setOrderSchedule, orderSchedule = {} }) => {
  const [state, setState] = React.useState(orderSchedule);
  const formName = "order-schedule";

  React.useEffect(() => setState(orderSchedule), [orderSchedule]);

  return (
    <div className={"setting-form"}>
      <h3>Order Schedule</h3>
      <div className={"schedule-form"}>
        <div className={"extra-fields-container"}>
          <form className={"extra-field"}>
            <span>Schedule:</span>
            <Picker
              value={state.scheduleType || "DAY_BEFORE"}
              onChange={(e) => setState({ ...state, scheduleType: e.target.value })}
            >
              <option value={"DAY_BEFORE"}>Day before</option>
              <option value={"DAY_OF"}>Day of</option>
              <option value={"CUSTOM"}>Custom</option>
            </Picker>
          </form>
          <form className={"extra-field"}>
            <span>Cutoff Time</span>
            <TimeField
              formName={formName}
              fieldName={"default-time"}
              setState={(value) => setState({ ...state, defaultTime: value })}
              state={state.defaultTime}
              showError={false}
            />
          </form>
        </div>
        {state.scheduleType === "CUSTOM" && (
          <ScheduleField
            formName={formName}
            state={state.schedule}
            setState={(value) => setState({ ...state, schedule: value })}
            defaultTime={state.defaultTime}
          />
        )}
        <div className={"submit-buttons"}>
          <input
            type={"button"}
            className={"styled-button cancel"}
            value={"Reset"}
            onClick={() => setState(orderSchedule)}
          />
          <input
            type={"submit"}
            className={"styled-button"}
            value={"Update"}
            onClick={() => setOrderSchedule(state)}
          />
        </div>
      </div>
    </div>
  );
};