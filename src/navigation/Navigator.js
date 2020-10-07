import React from "react";
import { Switch, Route, Redirect } from "react-router-dom";
import { connect } from "react-redux";
import Login from "../screens/Login";
import Home from "../screens/Home";
import { authListener } from "../redux/Actions";

const Navigator = ({ authenticated, authListener }) => {
  React.useEffect(authListener, []);
  return (
    <Switch>
      <Route
        path={"/"}
        exact
        render={({location}) => <Redirect to={{pathname: "/login", state: {from: location}}}/>}
      />
      <Route path={"/admin"} render={({location}) => (
        authenticated
          ? <Home/>
          : <Redirect to={{pathname: "/login", state: {from: location}}}/>
      )}/>
      <Route path={"/login"} render={({location}) => (
        authenticated
          ? <Redirect to={{pathname: "/admin", state: {from: location}}}/>
          : <Login/>
      )}/>
    </Switch>
  )
};

const mapStateToProps = ({ user }) => ({ authenticated: !!user });

const mapDispatchToProps = (dispatch) => ({
  authListener: () => authListener(dispatch)
})

export default connect(mapStateToProps, mapDispatchToProps)(Navigator);