import React from "react";

const Picker = ({ children, ...props }) => (
  <div className={"picker"}>
    <select {...props}>
      {children}
    </select>
    <div className={"caret"} />
  </div>
);

export default Picker;