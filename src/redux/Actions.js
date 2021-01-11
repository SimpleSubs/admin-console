import {
  firestore,
  auth,
  checkIsAdmin,
  deleteUsersFunction,
  setEmail,
  resetPasswordsFunction,
  listAllUsers
} from "../constants/Firebase";
import { parseISO } from "../constants/Date";
import moment from "moment";

const Actions = {
  UPDATE_ORDERS: "UPDATE_ORDERS",
  UPDATE_USERS: "UPDATE_USERS",
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
  checkIsAdmin(email).then((isAdmin) => {
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
  deleteUsersFunction(uids).then(({ successCount }) => {
    console.log("Successfully deleted " + successCount + " users");
    dispatch(setLoading(false));
  }).catch((error) => reportError(error, dispatch));
}

export function updateOrder(id, order, dispatch) {
  dispatch(setLoading(true));
  firestore.collection("allOrders").doc(id)
    .set(order)
    .then(() => {
      console.log("Successfully updated order");
      dispatch(setLoading(false));
    }).catch((error) => console.error(error));
}

export function deleteOrders(orders, dispatch) {
  dispatch(setLoading(true));
  const allOrders = firestore.collection("allOrders");
  Promise.all(orders.map((order) => allOrders.doc(order).delete()))
    .then(() => {
      console.log("Successfully deleted " + orders.length + " orders");
      dispatch(setLoading(false));
    }).catch((error) => reportError(error, dispatch));
}

export async function updateUser(uid, userData, prevUserData, dispatch) {
  dispatch(setLoading(true));
  if (userData.email !== prevUserData.email) {
    try {
      await setEmail(userData.email, uid);
    } catch (e) {
      reportError(e, dispatch);
    }
  }
  try {
    await firestore.collection("userData").doc(uid).set(userData);
    console.log("Successfully updated user data.");
    dispatch(setLoading(false));
  } catch (e) {
    reportError(e, dispatch);
  }
}

export function resetPasswords(uids, dispatch) {
  dispatch(setLoading(true));
  resetPasswordsFunction(uids).then((password) => {
    console.log("Successfully reset passwords to '" + password + "'.");
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
        // Filter out all orders before today
        if (!parseISO(data.date).isBefore(moment(), "day")) {
          orders.push({
            ...doc.data(),
            key: doc.id
          });
        }
      });
      dispatch(updateOrders(orders));
    });
}

export function usersListener(dispatch, isLoggedIn) {
  if (!isLoggedIn) return;
  return firestore.collection("userData")
    .onSnapshot((querySnapshot) => {
      dispatch(setLoading(true));
      let users = {};
      querySnapshot.forEach((doc) => {
        users[doc.id] = doc.data();
      });
      listAllUsers().then((result) => {
        for (let uid of Object.keys(result)) {
          if (users[uid]) {
            users[uid] = {
              ...users[uid],
              ...result[uid],
              key: uid
            }
          } else {
            users[uid] = {
              ...result[uid],
              key: uid
            }
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

export function userDataListener(dispatch) {
  const uid = auth.currentUser?.uid;
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