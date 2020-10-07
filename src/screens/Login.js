import React from "react";
import "../stylesheets/Login.css";
import { logIn } from "../redux/Actions";
import { connect } from "react-redux";

const NO_ERROR = " ";
const EMAIL_REGEX = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i;

function getErrorMessage(code) {
  switch (code) {
    case null:
      return NO_ERROR;
    case "permission-denied":
      return "User is not an admin";
    case "auth/wrong-password":
      return "Incorrect password";
    case "invalid-email":
      return "Please enter a valid email address";
    case "no-password":
      return "Please enter a password";
    default:
      return "Something went wrong";
  }
}

function validate({ email, password }) {
  if (!EMAIL_REGEX.test(email)) {
    return "invalid-email";
  } else if (password.length === 0) {
    return "no-password";
  } else {
    return null;
  }
}

const Login = ({ logIn }) => {
  const [state, setState] = React.useState({ email: "", password: ""});
  const [errorMessage, setErrorMessage] = React.useState(NO_ERROR);

  const handleLogin = (event) => {
    event.preventDefault();
    let errorCode = validate(state);
    setErrorMessage(getErrorMessage(errorCode));
    if (!errorCode) {
      logIn(state.email, state.password, (code) => setErrorMessage(getErrorMessage(code)));
    }
  };
  const setEmail = (event) => setState({ ...state, email: event.target.value });
  const setPassword = (event) => setState({ ...state, password: event.target.value });

  return (
    <div id={"Login"} className={"container"}>
      <div className={"content-container"}>
        <h1>SimpleSubs Admin Console</h1>
        <p>Sign in below to get started</p>
        <form className={"login-form"} onSubmit={handleLogin}>
          <label>
            <span>Email address</span>
            <input
              type={"email"}
              placeholder={"Email address"}
              id={"email"}
              name={"email"}
              value={state.email}
              onChange={setEmail}
            />
          </label>
          <br />
          <label>
            <span>Password</span>
            <input
              type={"password"}
              placeholder={"Password"}
              id={"password"}
              name={"password"}
              value={state.password}
              onChange={setPassword}
            />
          </label>
          <br />
          <input className={"styled-button"} type={"submit"} value={"Login"} />
          <p className={"error " + (errorMessage !== NO_ERROR ? "shown" : "hidden")}>{errorMessage}</p>
        </form>
      </div>
    </div>
  )
}

const mapDispatchToProps = (dispatch) => ({
  logIn: (email, password, setError) => logIn(email, password, dispatch, setError)
});

export default connect(null, mapDispatchToProps)(Login);