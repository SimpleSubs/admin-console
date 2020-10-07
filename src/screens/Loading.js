import React from "react";
import "../stylesheets/Loading.css";

const LOADING_SVG = require("../assets/loading.svg");

const Loading = () => (
  <div id={"Loading"}>
    <img src={LOADING_SVG} alt={"Loading..."} />
  </div>
)

export default Loading;