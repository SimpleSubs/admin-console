import React from "react";
import Table from "../components/Table";
import HamburgerButton from "../components/HamburgerButton";
import { connect } from "react-redux";
import { UserFieldColumns, PasswordField } from "../constants/TableConstants";
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
  setOrderSchedule,
  addMenu,
  editMenu,
  deleteMenu
} from "../redux/Actions";
import "../stylesheets/AppSettings.scss";
import Loading from "./Loading";
import OrderOptions from "../components/OrderOptions";

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

const AppSettings = ({ navbarHeight, appSettings, domain, menus, setOrderOptions, setUserFields, setDomainData, setDefaultUser, setLunchSchedule, setOrderSchedule, addMenu, editMenu, deleteMenu }) => (
  !appSettings ?
    <Loading /> :
    <div id={"Orders"} className={"content-container"} style={{ height: "calc(100vh - " + navbarHeight + "px)" }}>
      <OrderOptions
        orderOptions={appSettings.orderOptions}
        menus={menus}
        setOrderOptions={(data) => setOrderOptions(data, domain.id)}
        addMenu={(date) => addMenu(date, domain.id)}
        editMenu={(id, data) => editMenu(id, data, domain.id)}
        deleteMenu={(id) => deleteMenu(id, domain.id)}
      />
      <UserFieldsTable
        userFields={appSettings.userFields}
        setUserFields={(newFields) => setUserFields(newFields, domain.id)}
      />
      <LunchSchedule
        lunchSchedule={appSettings.lunchSchedule}
        setLunchSchedule={(data) => setLunchSchedule(data, domain.id)}
      />
      <OrderSchedule
        orderSchedule={appSettings.orderSchedule}
        setOrderSchedule={(data) => setOrderSchedule(data, domain.id)}
      />
      <DefaultUserForm
        defaultUser={appSettings.defaultUser}
        userFields={appSettings.userFields}
        setDefaultUser={(data) => setDefaultUser(data, domain.id)}
      />
      <DomainForm
        domain={domain}
        setDomainData={(data) => setDomainData(data, domain.id)}
      />
    </div>
);

const mapStateToProps = ({ appSettings, domain, menus }) => ({
  appSettings,
  domain,
  menus
});

const mapDispatchToProps = (dispatch) => ({
  setOrderOptions: (newOptions, domain) => setOrderOptions(newOptions, dispatch, domain),
  setUserFields: (newFields, domain) => setUserFields(newFields, dispatch, domain),
  setDomainData: (data, domainId) => setDomainData(data, dispatch, domainId),
  setDefaultUser: (data, domain) => setDefaultUser(data, dispatch, domain),
  setLunchSchedule: (data, domain) => setLunchSchedule(data, dispatch, domain),
  setOrderSchedule: (data, domain) => setOrderSchedule(data, dispatch, domain),
  addMenu: (date, domain) => addMenu(date, dispatch, domain),
  editMenu: (id, data, domain) => editMenu(id, data, dispatch, domain),
  deleteMenu: (id, domain) => deleteMenu(id, dispatch, domain)
})

export default connect(mapStateToProps, mapDispatchToProps)(AppSettings);