import React from "react";
import "../stylesheets/Loading.scss";
import { connect } from "react-redux";

const LOADING_SVG = require("../assets/loading.svg");

const Loading = ({ isLoggedIn }) => (
  <div id={"Loading"} className={isLoggedIn ? "auth" : ""}>
    <img src={LOADING_SVG} alt={"Loading..."} />
  </div>
)

const mapStateToProps = ({ user }) => ({
  isLoggedIn: !!user
})

export default connect(mapStateToProps, null)(Loading);