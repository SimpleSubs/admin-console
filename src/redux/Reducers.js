import Actions from "./Actions";
import { combineReducers } from "redux";

const orders = (state = null, action) => (
  action.type === Actions.UPDATE_ORDERS ?
    action.orders :
    state
);

const users = (state = null, action) => (
  action.type === Actions.UPDATE_USERS ?
    action.users :
    state
);

const appSettings = (state = null, action) => (
  action.type === Actions.UPDATE_APP_SETTINGS ?
    action.appSettings :
    state
);

const user = (state = null, action) => (
  action.type === Actions.SET_USER ?
    action.user :
    state
);

const domain = (state = null, action) => (
  action.type === Actions.SET_DOMAIN ?
    action.domain :
    state
);

const loading = (state = false, action) => (
  action.type === Actions.SET_LOADING ?
    action.loading :
    state
);

const hasAuthenticated = (state = false, action) => action.type === Actions.SET_USER ? true : state;

const consoleApp = combineReducers({
  orders,
  users,
  appSettings,
  user,
  domain,
  loading,
  hasAuthenticated
});

export default consoleApp;