import Actions from "./Actions";
import {combineReducers} from "redux";

const DEFAULT_APP_SETTINGS = {
  cutoffTime: {},
  orderOptions: [],
  userFields: []
}

const orders = (state = [], action) => (
  action.type === Actions.UPDATE_ORDERS ?
    action.orders :
    state
);

const users = (state = {}, action) => {
  switch (action.type) {
    case Actions.UPDATE_USERS:
      return {
        ...state,
        ...action.users
      }
    case Actions.DELETE_USERS:
      let newUsers = { ...state };
      for (let uid of action.users) {
        delete newUsers[uid];
      }
      return newUsers;
    default:
      return state;
  }
};

const appSettings = (state = DEFAULT_APP_SETTINGS, action) => (
  action.type === Actions.UPDATE_APP_SETTINGS ?
    action.appSettings :
    state
);

const user = (state = null, action) => (
  action.type === Actions.SET_USER ?
    action.user :
    state
);

const loading = (state = false, action) => (
  action.type === Actions.SET_LOADING ?
    action.loading :
    state
);

const consoleApp = combineReducers({
  orders,
  users,
  appSettings,
  user,
  loading
})

export default consoleApp;