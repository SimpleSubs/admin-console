import React from "react";

const StyledButton = ({ title, icon = "", onClick = () => {} }) => (
  <button className={"styled-button table-action"} onClick={onClick}>
    {title} <i className={"fas " + icon} />
  </button>
);

export default StyledButton;