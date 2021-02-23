import React from "react";
import SimpleForm from "./SimpleForm";

const SettingsForm = ({ data, fields, title, onSubmit, id }) => (
  <div className={"setting-form"}>
    <h3>{title}</h3>
    <SimpleForm
      onSubmit={onSubmit}
      prevData={data}
      fields={fields}
      id={id}
      buttonTitles={{ cancel: "Reset", done: "Update" }}
    />
  </div>
);

export default SettingsForm;