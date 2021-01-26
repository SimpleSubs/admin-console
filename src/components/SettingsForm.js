import React from "react";
import SimpleForm from "./SimpleForm";

const SettingsForm = ({ data, fields, title, onSubmit }) => (
  <div className={"setting-form"}>
    <h3>{title}</h3>
    <SimpleForm
      onSubmit={onSubmit}
      prevData={data}
      fields={fields}
      id={"domain-form"}
      buttonTitles={{ cancel: "Reset", done: "Update" }}
    />
  </div>
);

export default SettingsForm;