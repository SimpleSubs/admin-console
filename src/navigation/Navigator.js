import React from "react";
import { Switch, Route, Redirect } from "react-router-dom";
import { connect } from "react-redux";
import Login from "../screens/Login";
import Home from "../screens/Home";
import Loading from "../screens/Loading";
import PageNotFound from "../screens/PageNotFound";
import { authListener } from "../redux/Actions";

const ProtectedRoute = ({ isLoggedIn, hasAuthenticated, thisRoute, location }) => {
  let target = isLoggedIn ?
    "/authenticated" :
    hasAuthenticated ? "/login" : "/";
  switch (target) {
    case "/authenticated":
      return (
        target === thisRoute ?
          <Home /> :
          <Redirect to={{ pathname: "/authenticated", state: { from: location }}} />
      );
    case "/login":
      return (
        target === thisRoute ?
          <Login /> :
          <Redirect to={{ pathname: "/login", state: { from: location }}} />
      );
    default:
      return (
        target === thisRoute ?
          <Loading /> :
          <Redirect to={{ pathname: "/", state: { from: location }}} />
      );
  }
}

const Navigator = ({ isLoggedIn, hasAuthenticated, authListener }) => {
  React.useEffect(authListener, []);
  return (
    <Switch>
      <Route
        path={"/"}
        exact
        render={({ location }) => (
          <ProtectedRoute
            isLoggedIn={isLoggedIn}
            hasAuthenticated={hasAuthenticated}
            thisRoute={"/"}
            location={location}
          />
        )}
      />
      <Route
        path={"/authenticated"}
        render={({ location }) => (
          <ProtectedRoute
            isLoggedIn={isLoggedIn}
            hasAuthenticated={hasAuthenticated}
            thisRoute={"/authenticated"}
            location={location}
          />
        )}
      />
      <Route
        path={"/login"}
        render={({ location }) => (
          <ProtectedRoute
            isLoggedIn={isLoggedIn}
            hasAuthenticated={hasAuthenticated}
            thisRoute={"/login"}
            location={location}
          />
        )}
      />
      <Route component={PageNotFound} />
    </Switch>
  );
};

const mapStateToProps = ({ user, hasAuthenticated }) => ({
  isLoggedIn: !!user,
  hasAuthenticated
});

const mapDispatchToProps = (dispatch) => ({
  authListener: () => authListener(dispatch)
});

export default connect(mapStateToProps, mapDispatchToProps)(Navigator);