import React from "react";
import { connect } from "react-redux";

const Loader = ({ loading }) => (
  <div className={"loader" + (loading ? " shown" : " hidden")}>
    Loading...
    <i className="fas fa-sync"/>
  </div>
);

const mapStateToProps = ({ loading }) => ({ loading });

export default connect(mapStateToProps, null)(Loader);