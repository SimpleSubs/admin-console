import firebase from "firebase/app";
import "firebase/firestore";
import "firebase/auth";
import "firebase/functions";
import "firebase/analytics";
import firebaseConfig from "../firebase-config.json";

firebase.initializeApp(firebaseConfig);
// firebase.analytics();

const executeFunction = async (name, data = {}) => {
  let authorization = firebase.auth().currentUser ?
    { "Authorization": "Bearer " + await firebase.auth().currentUser.getIdToken(true) } :
    {};
  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authorization,
    },
    body: JSON.stringify({ data })
  };
  try {
    let response = await fetch("https://us-central1-sandwich-orders.cloudfunctions.net/" + name, requestOptions);
    return (await response.json()).result;
  } catch (e) {
    throw new Error(e.message);
  }
}

export const checkIsAdmin = async (email) => await executeFunction("checkIsAdmin", { email });
export const deleteUsersFunction = async (uids) => await executeFunction("deleteUsers", { uids });
export const setEmail = async (email, uid) => await executeFunction("setEmail", { email, uid });
export const resetPasswordsFunction = async (uids) => await executeFunction("resetPasswords", { uids });
export const listAllUsers = async () => await executeFunction("listAllUsers");
export const updateDomainData = async (id, data) => await executeFunction("updateDomainData", { id, data });

export const firestore = firebase.firestore();
export const auth = firebase.auth();

export function arrayToObject(arr) {
  let obj = {};
  for (let i = 0; i < arr.length; i++) {
    obj[i.toString()] = arr[i];
  }
  return obj;
}