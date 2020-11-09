import React from "react";
import Table from "../components/Table";
import HamburgerButton from "../components/HamburgerButton";
import { connect } from "react-redux";
import { OrderOptionColumns, UserFieldColumns } from "../constants/TableConstants";
import StyledButton from "../components/StyledButton";
import { setCutoffTime, setUserFields, setOrderOptions } from "../redux/Actions";
import Picker from "../components/Picker";
import "../stylesheets/AppSettings.css";
import Loading from "./Loading";

function toStateFormat(cutoffTime) {
  if (!cutoffTime || cutoffTime === {}) {
    return {};
  }
  let { hours, minutes } = cutoffTime;
  let isAM = hours < 12;
  if (hours === 0) {
    hours = 12;
  } else if (!isAM) {
    hours -= 12;
  }
  return { hours, minutes, isAM };
}

const CutoffTime = ({ appSettings, setCutoffTime }) => {
  const { cutoffTime } = appSettings;
  const [showError, toggleError] = React.useState(false);
  const [state, setState] = React.useState(toStateFormat(cutoffTime));

  const submit = (e) => {
    e.preventDefault();
    let { hours, minutes, isAM } = state;
    if (isNaN(hours) || isNaN(minutes) || hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
      toggleError(true);
      return;
    }
    toggleError(false);
    if (isAM && hours === 12) {
      hours = 0;
    } else if (!isAM && hours !== 12) {
      hours += 12;
    }
    setCutoffTime({ hours, minutes }, appSettings);
  };
  const setHours = (e) => {
    setState({ ...state, hours: parseInt(e.target.value) });
  };
  const setMinutes = (e) => {
    setState({ ...state, minutes: parseInt(e.target.value) });
  };
  const setAMPM = (e) => {
    setState({...state, isAM: e.target.value === "am"});
  };

  React.useEffect(() => setState(toStateFormat(cutoffTime)), [cutoffTime]);

  return (
    <div className={"cutoffTime"}>
      <p>Cutoff Time</p>
      <div className={"form-wrapper"}>
        <form onSubmit={submit}>
          <label>
            <span>Hours</span>
            <input
              type={"number"}
              placeholder={"Hour"}
              id={"hour"}
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
              id={"minute"}
              name={"minute"}
              value={(!isNaN(state.minutes) && state.minutes < 10 ? "0" : "") + state.minutes}
              onChange={setMinutes}
            />
          </label>
          <Picker name={"amPM"} id={"amPM"} value={state.isAM ? "am" : "pm"} onChange={setAMPM}>
            <option value={"am"}>AM</option>
            <option value={"pm"}>PM</option>
          </Picker>
          <input className={"styled-button"} type={"submit"} value={"Update"} disabled={state === toStateFormat(cutoffTime)} />
        </form>
        <p className={"error " + (showError ? "shown" : "hidden")}>Please enter a valid time</p>
      </div>
    </div>
  )
}

const OrderOptionsTable = ({ appSettings, setOrderOptions }) => {
  const editOrderOption = (index, editedOption) => {
    let newOptions = [...appSettings.orderOptions];
    if (index !== null) {
      newOptions[index] = editedOption;
    } else {
      newOptions.push(editedOption);
    }
    setOrderOptions(newOptions, appSettings);
  };

  const deleteOrderOptions = (selected) => {
    let newOptions = Object.keys(selected).length > 0 ?
      appSettings.orderOptions.filter((option, index) => !selected[index]) :
      [];
    setOrderOptions(newOptions, appSettings);
  }

  const MenuButtons = {
    Left: ({ openModal }) => <StyledButton title={"Create"} icon={"fa-plus"} onClick={openModal} />,
    Right: ({ selected }) => (
      <HamburgerButton
        selected={selected}
        actions={(anySelected) => [{
          title: `Delete ${anySelected ? "selected" : "all"} order fields`,
          action: () => deleteOrderOptions(selected)
        }]}
      />
    )
  };

  return (
    <Table
      id={"order-options-table"}
      custom
      data={appSettings.orderOptions}
      columns={OrderOptionColumns}
      title={"Order Fields"}
      MenuButtons={MenuButtons}
      onEdit={editOrderOption}
      pushState={(newState) => setOrderOptions(newState, appSettings)}
    />
  );
};

const UserFieldsTable = ({ appSettings, setUserFields }) => {
  const editUserField = (index, editedField) => {
    let newFields = [...appSettings.userFields];
    if (index !== null) {
      newFields[index] = editedField;
    } else {
      newFields.push(editedField);
    }
    setUserFields(newFields, appSettings);
  };

  const deleteUserFields = (selected) => {
    let newFields = Object.keys(selected).length > 0 ?
      appSettings.userFields.filter((option, index) => !selected[index]) :
      [];
    setUserFields(newFields, appSettings);
  };

  const MenuButtons = {
    Left: ({ openModal }) => <StyledButton title={"Create"} icon={"fa-plus"} onClick={openModal} />,
    Right: ({ selected }) => (
      <HamburgerButton
        selected={selected}
        actions={(anySelected) => [{
          title: `Delete ${anySelected ? "selected" : "all"} user fields`,
          action: () => deleteUserFields(selected)
        }]}
      />
    )
  };

  return (
    <Table
      id={"user-fields-table"}
      custom
      data={appSettings.userFields}
      columns={UserFieldColumns}
      title={"User Fields"}
      MenuButtons={MenuButtons}
      onEdit={editUserField}
      pushState={(newState) => setUserFields(newState, appSettings)}
    />
  );
};

const AppSettings = ({ navbarHeight, appSettings, setCutoffTime, setOrderOptions, setUserFields }) => (
  !appSettings ?
    <Loading /> :
    <div id={"Orders"} className={"content-container"} style={{ height: "calc(100vh - " + navbarHeight + "px)" }}>
      <CutoffTime appSettings={appSettings} setCutoffTime={setCutoffTime} />
      <OrderOptionsTable appSettings={appSettings} setOrderOptions={setOrderOptions} />
      <UserFieldsTable appSettings={appSettings} setUserFields={setUserFields} />
    </div>
);

const mapStateToProps = ({ appSettings }) => ({ appSettings });

const mapDispatchToProps = (dispatch) => ({
  setCutoffTime: (time, appSettings) => setCutoffTime(time, appSettings, dispatch),
  setOrderOptions: (newOptions, appSettings) => setOrderOptions(newOptions, appSettings, dispatch),
  setUserFields: (newFields, appSettings) => setUserFields(newFields, appSettings, dispatch)
})

export default connect(mapStateToProps, mapDispatchToProps)(AppSettings);