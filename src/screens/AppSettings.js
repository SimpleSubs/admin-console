import React from "react";
import Table from "../components/Table";
import HamburgerButton from "../components/HamburgerButton";
import { connect } from "react-redux";
import { OrderOptionColumns, UserFieldColumns } from "../constants/TableConstants";
import StyledButton from "../components/StyledButton";
import { setCutoffTime, setUserFields, setOrderOptions } from "../redux/Actions";
import Picker from "../components/Picker";
import "../stylesheets/AppSettings.scss";
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

const CutoffTime = ({ cutoffTime, setCutoffTime }) => {
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
    setCutoffTime({ hours, minutes });
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

const OrderOptionsTable = ({ orderOptions, setOrderOptions }) => {
  const editOrderOption = (index, editedOption) => {
    let newOptions = [...orderOptions];
    if (index !== null) {
      newOptions[index] = editedOption;
    } else {
      newOptions.push(editedOption);
    }
    setOrderOptions(newOptions);
  };

  const deleteOrderOptions = (selected) => {
    let newOptions = Object.keys(selected).length > 0 ?
      orderOptions.filter((option, index) => !selected[index]) :
      [];
    setOrderOptions(newOptions);
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
      data={orderOptions}
      columns={OrderOptionColumns}
      title={"Order Fields"}
      MenuButtons={MenuButtons}
      onEdit={editOrderOption}
      pushState={(newState) => setOrderOptions(newState)}
    />
  );
};

const UserFieldsTable = ({ userFields, setUserFields }) => {
  const editUserField = (index, editedField) => {
    let newFields = [...userFields];
    if (index !== null) {
      newFields[index] = editedField;
    } else {
      newFields.push(editedField);
    }
    setUserFields(newFields);
  };

  const deleteUserFields = (selected) => {
    let newFields = Object.keys(selected).length > 0 ?
      userFields.filter((option, index) => !selected[index]) :
      [];
    setUserFields(newFields);
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
      data={userFields}
      columns={UserFieldColumns}
      title={"User Fields"}
      MenuButtons={MenuButtons}
      onEdit={editUserField}
      pushState={(newState) => setUserFields(newState)}
    />
  );
};

const AppSettings = ({ navbarHeight, appSettings, domain, setCutoffTime, setOrderOptions, setUserFields }) => (
  !appSettings ?
    <Loading /> :
    <div id={"Orders"} className={"content-container"} style={{ height: "calc(100vh - " + navbarHeight + "px)" }}>
      <CutoffTime cutoffTime={appSettings.cutoffTime} setCutoffTime={(time) => setCutoffTime(time, domain)} />
      <OrderOptionsTable orderOptions={appSettings.orderOptions} setOrderOptions={(newOptions) => setOrderOptions(newOptions, domain)} />
      <UserFieldsTable userFields={appSettings.userFields} setUserFields={(newFields) => setUserFields(newFields, domain)} />
    </div>
);

const mapStateToProps = ({ appSettings, domain }) => ({
  appSettings,
  domain
});

const mapDispatchToProps = (dispatch) => ({
  setCutoffTime: (time, domain) => setCutoffTime(time, dispatch, domain),
  setOrderOptions: (newOptions, domain) => setOrderOptions(newOptions, dispatch, domain),
  setUserFields: (newFields, domain) => setUserFields(newFields, dispatch, domain)
})

export default connect(mapStateToProps, mapDispatchToProps)(AppSettings);