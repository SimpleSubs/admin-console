import React from "react";
import Table from "../components/Table";
import HamburgerButton from "../components/HamburgerButton";
import { connect } from "react-redux";
import { OrderOptionColumns, UserFieldColumns, PasswordField } from "../constants/TableConstants";
import DomainFields from "../constants/DomainFields";
import SettingsForm from "../components/SettingsForm";
import StyledButton from "../components/StyledButton";
import { LunchSchedule, OrderSchedule } from "../components/ScheduleForm";
import {
  setUserFields,
  setOrderOptions,
  setDomainData,
  setDefaultUser,
  setLunchSchedule,
  setOrderSchedule
} from "../redux/Actions";
import "../stylesheets/AppSettings.scss";
import Loading from "./Loading";

const DomainForm = ({ domain, setDomainData }) => (
  <SettingsForm
    data={domain}
    onSubmit={setDomainData}
    title={"Organization Information"}
    fields={DomainFields}
    id={"domain-form"}
  />
);

const DefaultUserForm = ({ userFields, defaultUser, setDefaultUser }) => {
  const processedFields = userFields.map((field) => ({ ...field, type: field.inputType, required: false }));
  return (
    <SettingsForm
      data={defaultUser}
      onSubmit={setDefaultUser}
      title={"Default User"}
      fields={[PasswordField, ...processedFields]}
      id={"default-user-form"}
      checkRequired={false}
    />
  )
};

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
    Right: ({ selected, setCarefulSubmit }) => (
      <HamburgerButton
        selected={selected}
        actions={(anySelected) => [{
          title: `Delete ${anySelected ? "selected" : "all"} order fields`,
          action: () => setCarefulSubmit(() => deleteOrderOptions(selected))
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
    Right: ({ selected, setCarefulSubmit }) => (
      <HamburgerButton
        selected={selected}
        actions={(anySelected) => [{
          title: `Delete ${anySelected ? "selected" : "all"} user fields`,
          action: () => setCarefulSubmit(() => deleteUserFields(selected))
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

const AppSettings = ({ navbarHeight, appSettings, domain, setOrderOptions, setUserFields, setDomainData, setDefaultUser, setLunchSchedule, setOrderSchedule }) => (
  !appSettings ?
    <Loading /> :
    <div id={"Orders"} className={"content-container"} style={{ height: "calc(100vh - " + navbarHeight + "px)" }}>
      <DomainForm domain={domain} setDomainData={(data) => setDomainData(data, domain.id)} />
      <DefaultUserForm defaultUser={appSettings.defaultUser} userFields={appSettings.userFields} setDefaultUser={(data) => setDefaultUser(data, domain.id)} />
      <LunchSchedule lunchSchedule={appSettings.lunchSchedule} setLunchSchedule={(data) => setLunchSchedule(data, domain.id)} />
      <OrderSchedule orderSchedule={appSettings.orderSchedule} setOrderSchedule={(data) => setOrderSchedule(data, domain.id)} />
      <OrderOptionsTable orderOptions={appSettings.orderOptions} setOrderOptions={(newOptions) => setOrderOptions(newOptions, domain.id)} />
      <UserFieldsTable userFields={appSettings.userFields} setUserFields={(newFields) => setUserFields(newFields, domain.id)} />
    </div>
);

const mapStateToProps = ({ appSettings, domain }) => ({
  appSettings,
  domain
});

const mapDispatchToProps = (dispatch) => ({
  setOrderOptions: (newOptions, domain) => setOrderOptions(newOptions, dispatch, domain),
  setUserFields: (newFields, domain) => setUserFields(newFields, dispatch, domain),
  setDomainData: (data, domainId) => setDomainData(data, dispatch, domainId),
  setDefaultUser: (data, domain) => setDefaultUser(data, dispatch, domain),
  setLunchSchedule: (data, domain) => setLunchSchedule(data, dispatch, domain),
  setOrderSchedule: (data, domain) => setOrderSchedule(data, dispatch, domain)
})

export default connect(mapStateToProps, mapDispatchToProps)(AppSettings);