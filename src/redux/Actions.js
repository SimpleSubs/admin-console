import {
  firestore,
  auth,
  arrayToObject,
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
  SET_DOMAIN: "SET_DOMAIN",
  SET_USER: "SET_USER",
  SET_LOADING: "SET_LOADING"
};

export default Actions;

const domainData = (domain) => firestore.collection("domains").doc(domain);

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

function setDomain(domain) {
  return {
    type: Actions.SET_DOMAIN,
    domain
  }
}

export function setLoading(loading) {
  return {
    type: Actions.SET_LOADING,
    loading
  }
}

async function getDomain(uid, dispatch) {
  try {
    let domain = (await firestore.collection("userDomains").doc(uid).get()).data().domain;
    dispatch(setDomain(domain));
  } catch (error) {
    reportError(error, dispatch);
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

export function updateOrder(id, order, dispatch, domain) {
  dispatch(setLoading(true));
  domainData(domain).collection("orders").doc(id)
    .set(order)
    .then(() => {
      console.log("Successfully updated order");
      dispatch(setLoading(false));
    }).catch((error) => console.error(error));
}

export function deleteOrders(orders, dispatch, domain) {
  dispatch(setLoading(true));
  const allOrders = domainData(domain).collection("orders");
  Promise.all(orders.map((order) => allOrders.doc(order).delete()))
    .then(() => {
      console.log("Successfully deleted " + orders.length + " orders");
      dispatch(setLoading(false));
    }).catch((error) => reportError(error, dispatch));
}

export async function updateUser(uid, userData, prevUserData, dispatch, domain) {
  dispatch(setLoading(true));
  if (userData.email !== prevUserData.email) {
    try {
      await setEmail(userData.email, uid);
    } catch (e) {
      reportError(e, dispatch);
    }
  }
  try {
    await domainData(domain).collection("userData").doc(uid).set(userData);
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

export function setCutoffTime(time, dispatch, domain) {
  dispatch(setLoading(true));
  domainData(domain).collection("appData").doc("cutoffTime").set(time)
    .then(() => {
      console.log("Successfully updated cutoff time");
      dispatch(setLoading(false));
    }).catch((error) => reportError(error, dispatch));
}

export function setOrderOptions(newOptions, dispatch, domain) {
  dispatch(setLoading(true));
  domainData(domain).collection("appData").doc("orderOptions").set(arrayToObject(newOptions))
    .then(() => {
      console.log("Successfully updated order fields");
      dispatch(setLoading(false));
    }).catch((error) => reportError(error, dispatch));
}

export function setUserFields(newFields, dispatch, domain) {
  dispatch(setLoading(true));
  domainData(domain).collection("appData").doc("userFields").set(arrayToObject(newFields))
    .then(() => {
      console.log("Successfully updated user fields");
      dispatch(setLoading(false));
    }).catch((error) => reportError(error, dispatch));
}

export function orderListener(dispatch, isLoggedIn, domain) {
  if (!isLoggedIn) return;
  return domainData(domain).collection("orders")
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

export function usersListener(dispatch, isLoggedIn, domain) {
  if (!isLoggedIn) return;
  return domainData(domain).collection("userData")
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

export function appSettingsListener(dispatch, isLoggedIn, domain) {
  if (!isLoggedIn) return;
  return domainData(domain).collection("appData")
    .onSnapshot((querySnapshot) => {
      dispatch(setLoading(true));
      let appSettings = {};
      if (querySnapshot.empty) {
        setCutoffTime({ hours: 0, minutes: 0 }, dispatch, domain);
        setOrderOptions([], dispatch, domain);
        setUserFields([], dispatch, domain);
        return;
      }
      querySnapshot.forEach((doc) => {
        if (doc.id === "cutoffTime") {
          appSettings[doc.id] = doc.data();
        } else {
          appSettings[doc.id] = Object.values(doc.data());
        }
      });
      dispatch(updateAppSettings(appSettings));
    })
}

export function authListener(dispatch) {
  return auth.onAuthStateChanged((user) => {
    if (user) {
      getDomain(user.uid, dispatch).then(() => dispatch(setUserData({})));
    } else {
      dispatch(setUserData(null));
      setDomain(null);
    }
  });
}

export function userDataListener(dispatch, domain) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  return domainData(domain).collection("userData").doc(uid)
    .onSnapshot((doc) => {
      dispatch(setUserData({
        ...doc.data(),
        email: auth.currentUser.email,
        uid
      }))
    });
}