import {
  firestore,
  auth,
  arrayToObject,
  checkIsAdmin,
  deleteUsersFunction,
  setEmail,
  resetPasswordsFunction,
  listAllUsers,
  updateDomainData
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
    appSettings: {
      cutoffTime: appSettings.cutoffTime || { hours: 0, minutes: 0 },
      defaultUser: appSettings.defaultUser || {},
      orderOptions: appSettings.orderOptions || [],
      userFields: appSettings.userFields || []
    }
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

async function getDomainId(uid, dispatch) {
  try {
    let domainId = (await firestore.collection("userDomains").doc(uid).get()).data().domain;
    dispatch(setDomain({ id: domainId }));
  } catch (error) {
    reportError(error, dispatch)
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
  deleteUsersFunction(uids).then(({ errors, uneditableUids }) => {
    console.log(`Successfully deleted ${uids.length - errors.length - uneditableUids.length} users`);
    console.log(`User does not have access to delete ${uneditableUids.length} users`);
    console.log(`Failed to delete ${errors.length} users`);
    dispatch(setLoading(false));
  }).catch((error) => reportError(error, dispatch));
}

export function updateOrder(id, order, dispatch, domain) {
  dispatch(setLoading(true));
  let dataToPush = { ...order };
  delete dataToPush.user;
  domainData(domain).collection("orders").doc(id)
    .set(dataToPush)
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
    let dataToPush = { ...userData };
    delete dataToPush.email;
    delete dataToPush.uid;
    await domainData(domain).collection("userData").doc(uid).set(dataToPush);
    console.log("Successfully updated user data.");
    dispatch(setLoading(false));
  } catch (e) {
    reportError(e, dispatch);
  }
}

export function resetPasswords(uids, dispatch) {
  dispatch(setLoading(true));
  resetPasswordsFunction(uids).then(({ password, success, failed }) => {
    console.log(`Successfully set ${success.length} passwords to '${password}'.`);
    console.log(`Failed to reset ${failed.length} passwords.`);
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

export function setDomainData(data, dispatch, domainId) {
  dispatch(setLoading(true));
  updateDomainData(domainId, data)
    .then(() => {
      console.log("Successfully updated organization data");
      dispatch(setLoading(false));
    }).catch((error) => reportError(error, dispatch));
}

export function setDefaultUser(data, dispatch, domain) {
  dispatch(setLoading(true));
  domainData(domain).collection("appData").doc("defaultUser").set(data)
    .then(() => {
      console.log("Successfully updated default user data");
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
      querySnapshot.forEach((doc) => {
        if (doc.id === "cutoffTime" || doc.id === "defaultUser") {
          appSettings[doc.id] = doc.data();
        } else {
          appSettings[doc.id] = Object.values(doc.data());
        }
      });
      dispatch(updateAppSettings(appSettings));
    })
}

export function domainListener(dispatch, isLoggedIn, domainId) {
  if (!isLoggedIn) return;
  return domainData(domainId).onSnapshot((doc) => {
    dispatch(setDomain({ id: domainId, ...doc.data() }));
  })
}

export function authListener(dispatch) {
  return auth.onAuthStateChanged((user) => {
    if (user) {
      getDomainId(user.uid, dispatch).then(() => dispatch(setUserData({})));
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