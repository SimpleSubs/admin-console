import {
  firestore,
  auth,
  arrayToObject,
  checkIsAdmin,
  deleteUsersFunction,
  setEmail,
  resetPasswordsFunction,
  listAllUsers,
  updateDomainData,
  importUsersFunction,
  getAllDomainData
} from "../constants/Firebase";
import { ISO_FORMAT, parseISO, firebaseTimeToStateTime, stateTimeToFirebaseTime } from "../constants/Date";
import moment from "moment";

const Actions = {
  UPDATE_ORDERS: "UPDATE_ORDERS",
  UPDATE_USERS: "UPDATE_USERS",
  UPDATE_APP_SETTINGS: "UPDATE_APP_SETTINGS",
  UPDATE_MENUS: "UPDATE_MENUS",
  SET_DOMAIN: "SET_DOMAIN",
  SET_DOMAIN_OPTIONS: "SET_DOMAIN_OPTIONS",
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
  };
}

function updateMenus(menus) {
  return {
    type: Actions.UPDATE_MENUS,
    menus
  };
}

function setDomain(domain) {
  return {
    type: Actions.SET_DOMAIN,
    domain
  };
}

function setDomainOptions(domains) {
  return {
    type: Actions.SET_DOMAIN_OPTIONS,
    domains
  };
}

export function setLoading(loading) {
  return {
    type: Actions.SET_LOADING,
    loading
  };
}

async function getDomainOptions(uid, dispatch) {
  try {
    const allDomainData = await getAllDomainData();
    dispatch(setDomainOptions(allDomainData));
    dispatch(setDomain({ id: allDomainData[0].id }));
  } catch (error) {
    reportError(error, dispatch)
  }
}

export function changeDomain(domain, dispatch) {
  dispatch(setDomain(domain));
  dispatch(updateOrders(null));
  dispatch(updateUsers(null));
  dispatch(updateAppSettings(null));
  dispatch(updateMenus(null));
}

export function logIn(email, password, dispatch, setError) {
  dispatch(setLoading(true));
  checkIsAdmin(email).then((adminDomains) => {
    if (!adminDomains || adminDomains.length === 0) {
      dispatch(setLoading(false));
      setError("permission-denied");
      return;
    }
    auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        setError(null);
        dispatch(setLoading(false));
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

export function deleteUsers(uidsToDelete, myUid, dispatch, domain) {
  dispatch(setLoading(true));
  let uids = uidsToDelete.filter((uid) => uid !== myUid);
  deleteUsersFunction(uids, domain).then(({ errors, uneditableUids }) => {
    console.log(`Successfully deleted ${uids.length - errors.length - uneditableUids.length} users`);
    console.log(`User does not have access to delete ${uneditableUids.length} users`);
    console.log(`Failed to delete ${errors.length} users`);
    dispatch(setLoading(false));
  }).catch((error) => reportError(error, dispatch));
}

export function updateOrder(id, order, dispatch, domain) {
  dispatch(setLoading(true));
  let dataToPush = { ...order };
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
      await setEmail(userData.email, uid, domain);
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

export function resetPasswords(uids, dispatch, domain) {
  dispatch(setLoading(true));
  resetPasswordsFunction(uids, domain).then(({ password, success, failed }) => {
    console.log(`Successfully set ${success.length} passwords to '${password}'.`);
    console.log(`Failed to reset ${failed.length} passwords.`);
    dispatch(setLoading(false));
  }).catch((error) => reportError(error, dispatch));
}

export function setOrderOptions(data, dispatch, domain) {
  dispatch(setLoading(true));
  domainData(domain).collection("appData").doc("orderOptions")
    .update(data)
    .then(() => {
      console.log("Successfully updated order fields");
      dispatch(setLoading(false));
    }).catch((error) => reportError(error, dispatch));
}

export function addMenu(date, dispatch, domain) {
  dispatch(setLoading(true));
  const sunday = parseISO(date).day(0).format(ISO_FORMAT);
  domainData(domain).collection("appData").doc("orderOptions").collection("dynamicMenu")
    .add({ active: [sunday] })
    .then(() => {
      console.log("Successfully created menu");
      dispatch(setLoading(false));
    }).catch((error) => reportError(error, dispatch));
}

export function deleteMenu(id, dispatch, domain) {
  dispatch(setLoading(true));
  domainData(domain).collection("appData").doc("orderOptions").collection("dynamicMenu").doc(id)
    .delete()
    .then(() => {
      console.log("Successfully deleted menu");
      dispatch(setLoading(false));
    }).catch((error) => reportError(error, dispatch));
}

export function editMenu(id, data, dispatch, domain) {
  dispatch(setLoading(true));
  domainData(domain).collection("appData").doc("orderOptions").collection("dynamicMenu").doc(id)
    .update(data)
    .then(() => {
      console.log("Successfully updated menu data");
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

export function setLunchSchedule(data, dispatch, domain) {
  dispatch(setLoading(true));
  let dataToPush = {
    ...data,
    defaultTime: stateTimeToFirebaseTime(data.defaultTime),
    schedule: data.schedule.map((day) => (
      day && day.time !== "default" ? { ...day, time: stateTimeToFirebaseTime(day.time) } : day
    ))
  };
  domainData(domain).collection("appData").doc("lunchSchedule").set(dataToPush)
    .then(() => {
      console.log("Successfully updated lunch schedule data");
      dispatch(setLoading(false));
    }).catch((error) => reportError(error, dispatch));
}

export function setOrderSchedule(data, dispatch, domain) {
  dispatch(setLoading(true));
  let dataToPush = {
    ...data,
    defaultTime: stateTimeToFirebaseTime(data.defaultTime),
    schedule: data.schedule?.map((day) => day && day !== "default" ? stateTimeToFirebaseTime(day) : day)
  };
  domainData(domain).collection("appData").doc("orderSchedule").set(dataToPush)
    .then(() => {
      console.log("Successfully updated order schedule data");
      dispatch(setLoading(false));
    }).catch((error) => reportError(error.dispatch));
}

export async function importUsers(data, dispatch, domain) {
  dispatch(setLoading(true));
  let userData = {};
  for (let user of data) {
    if (user.email) {
      let thisUser = { ...user };
      delete thisUser.email;
      userData[user.email] = thisUser;
    }
  }
  let { updated, created, errors } = await importUsersFunction(userData, domain);
  console.log(`Successfully updated ${Object.keys(updated).length} users`);
  console.log(`Successfully created ${Object.keys(created).length} users`);
  for (let error of errors) {
    console.error(error);
  }
  dispatch(setLoading(false));
}

export function orderListener(dispatch, isLoggedIn, domain) {
  if (!isLoggedIn) return;
  return domainData(domain).collection("orders")
    .where("date", ">=", moment().format(ISO_FORMAT))
    .onSnapshot((querySnapshot) => {
      dispatch(updateOrders(querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        key: doc.id
      }))));
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
      listAllUsers(domain).then((result) => {
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

export function dynamicMenuListener(dispatch, dynamic, domain) {
  if (!dynamic) {
    // Return empty function to mimic unmounting listener (for React.useEffect)
    return () => {};
  }
  return domainData(domain)
    .collection("appData")
    .doc("orderOptions")
    .collection("dynamicMenu")
    .onSnapshot((querySnapshot) => {
      dispatch(setLoading(true));
      const menus = [];
      querySnapshot.forEach((doc) => {
        const { active, ...data } = doc.data();
        // TODO: only allow a menu to exist for one week (not multiple)
        if (moment().isSameOrBefore(active[0], "week")) {
          menus.push({
            ...data,
            active: active[0],
            key: doc.id
          })
        }
      });
      dispatch(updateMenus(menus));
      dispatch(setLoading(false));
    });
}

export function appSettingsListener(dispatch, isLoggedIn, domain) {
  if (!isLoggedIn) return;
  return domainData(domain).collection("appData")
    .onSnapshot(async (querySnapshot) => {
      dispatch(setLoading(true));
      let appSettings = {};
      let data;
      for (const doc of querySnapshot.docs) {
        switch (doc.id) {
          case "cutoffTime":
          case "defaultUser":
          case "orderOptions":
            appSettings[doc.id] = doc.data();
            break;
          case "orderSchedule":
            data = doc.data() || {};
            appSettings[doc.id] = {
              ...data,
              defaultTime: firebaseTimeToStateTime(data.defaultTime),
              schedule: data.schedule?.map((day) => day && day !== "default" ? firebaseTimeToStateTime(day) : day)
            };
            break;
          // Filter out holidays before today
          case "lunchSchedule":
            data = doc.data() || {};
            appSettings[doc.id] = {
              ...data,
              defaultTime: firebaseTimeToStateTime(data.defaultTime),
              holidays: (data.holidays || []).filter((date) => parseISO(date).isSameOrAfter(moment(), "day")),
              schedule: data.schedule.map((day) => (
                day && day.time !== "default" ? { ...day, time: firebaseTimeToStateTime(day.time) } : day
              ))
            };
            break;
          // User fields are stored as objects with the index as keys
          case "userFields":
            appSettings[doc.id] = Object.values(doc.data());
            break;
          default:
            break;
        }
      }
      dispatch(updateAppSettings(appSettings));
      dispatch(setLoading(false));
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
      getDomainOptions(user.uid, dispatch).then(() => dispatch(setUserData({})));
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