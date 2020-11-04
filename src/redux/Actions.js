import { firestore, auth, executeFunction } from "../constants/Firebase";
import { parseISO } from "../constants/Date";
import moment from "moment";

const Actions = {
  UPDATE_ORDERS: "UPDATE_ORDERS",
  UPDATE_USERS: "UPDATE_USERS",
  DELETE_USERS: "DELETE_USERS",
  UPDATE_APP_SETTINGS: "UPDATE_APP_SETTINGS",
  SET_USER: "SET_USER",
  SET_LOADING: "SET_LOADING"
};

export default Actions;

const APP_SETTINGS_COLLECTION = firestore.collection("appData").doc("appConstants");

function reportError(error, dispatch) {
  dispatch(setLoading(false));
  console.error(error);
}

function setUserData(data) {
  return {
    type: Actions.SET_USER,
    user: data
  }
}

function updateOrders(orders) {
  return {
    type: Actions.UPDATE_ORDERS,
    orders
  };
}

function deleteUsersAction(users) {
  return {
    type: Actions.DELETE_USERS,
    users
  };
}

function updateUsers(users) {
  return {
    type: Actions.UPDATE_USERS,
    users
  };
}

function updateAppSettings(appSettings) {
  return {
    type: Actions.UPDATE_APP_SETTINGS,
    appSettings
  }
}

export function setLoading(loading) {
  return {
    type: Actions.SET_LOADING,
    loading
  }
}

export function logIn(email, password, dispatch, setError) {
  dispatch(setLoading(true));
  executeFunction("checkIsAdmin", { email }).then((isAdmin) => {
    if (!isAdmin) {
      dispatch(setLoading(false));
      setError("permission-denied");
      return;
    }
    auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        setError(null);
        dispatch(setLoading(false))
      })
      .catch((error) => {
        setError(error.code);
        reportError(error, dispatch)
      });
  }).catch((error) => {
    setError("internal");
    reportError(error, dispatch);
  });
}

export function logOut(dispatch) {
  dispatch(setLoading(true));
  auth.signOut()
    .then(() => dispatch(setLoading(false)))
    .catch((error) => reportError(error, dispatch));
}

export function deleteUsers(uidsToDelete, myUid, dispatch) {
  dispatch(setLoading(true));
  let uids = uidsToDelete.filter((uid) => uid !== myUid);
  executeFunction("deleteUsers", { uids }).then(({ successCount }) => {
    console.log("Successfully deleted " + successCount + " users");
    dispatch(setLoading(false));
  }).catch((error) => reportError(error, dispatch));
}

export function setCutoffTime(time, appSettings, dispatch) {
  dispatch(setLoading(true));
  APP_SETTINGS_COLLECTION.set({
    ...appSettings,
    cutoffTime: time
  }).then(() => {
    console.log("Successfully updated cutoff time");
    dispatch(setLoading(false));
  }).catch((error) => reportError(error, dispatch));
}

export function setOrderOptions(newOptions, appSettings, dispatch) {
  dispatch(setLoading(true));
  APP_SETTINGS_COLLECTION.set({
    ...appSettings,
    orderOptions: newOptions
  }).then(() => {
    console.log("Successfully updated order fields");
    dispatch(setLoading(false));
  }).catch((error) => reportError(error, dispatch));
}

export function setUserFields(newFields, appSettings, dispatch) {
  dispatch(setLoading(true));
  APP_SETTINGS_COLLECTION.set({
    ...appSettings,
    userFields: newFields
  }).then(() => {
    console.log("Successfully updated user fields");
    dispatch(setLoading(false));
  }).catch((error) => reportError(error, dispatch));
}

export function orderListener(dispatch, isLoggedIn) {
  if (!isLoggedIn) return;
  return firestore.collection("allOrders")
    .onSnapshot((querySnapshot) => {
      let orders = [];
      querySnapshot.forEach((doc) => {
        let data = doc.data();
        let now = moment();
        let momentDate = parseISO(data.date);
        // Filter out all orders before today
        if (momentDate.isAfter(now, "day") || momentDate.isSame(now, "day")) {
          orders.push(doc.data());
        }
      });
      dispatch(updateOrders(orders));
    })
}

export function usersListener(dispatch, isLoggedIn) {
  if (!isLoggedIn) return;
  return firestore.collection("userData")
    .onSnapshot((querySnapshot) => {
      dispatch(setLoading(true));
      let users = {};
      let added = {};
      let removed = [];
      querySnapshot.docChanges().forEach(({ doc, type }) => {
        if (type === "removed") {
          removed.push(doc.id);
        } else {
          added[doc.id] = doc.data();
        }
      });
      dispatch(deleteUsersAction(removed));
      executeFunction("getUsers", { uids: Object.keys(added) })
        .then((result) => {
          for (let uid of Object.keys(result.users)) {
            users[uid] = {
              email: result.users[uid],
              ...added[uid]
            }
          }
          dispatch(updateUsers(users));
          dispatch(setLoading(false));
        }).catch((error) => reportError(error, dispatch));
    });
}

export function appSettingsListener(dispatch, isLoggedIn) {
  if (!isLoggedIn) return;
  return APP_SETTINGS_COLLECTION.onSnapshot((doc) => {
    dispatch(updateAppSettings(doc.data()))
  })
}

export function authListener(dispatch) {
  return auth.onAuthStateChanged((user) => {
    if (user) {
      dispatch(setUserData({}));
    } else {
      dispatch(setUserData(null));
    }
  });
}

export function userDataListener(dispatch, uid) {
  if (!uid) return;
  return firestore.collection("userData").doc(uid)
    .onSnapshot((doc) => {
      dispatch(setUserData({
        ...doc.data(),
        email: auth.currentUser.email,
        uid
      }))
    });
}