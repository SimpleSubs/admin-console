import firebase from "firebase/app";
import "firebase/firestore";
import "firebase/auth";
import "firebase/functions";
import "firebase/analytics";
import firebaseConfig from "../firebase-config.json";

firebase.initializeApp(firebaseConfig);
firebase.analytics();

export const executeFunction = async (name, data = {}) => {
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

export const firestore = firebase.firestore();
export const auth = firebase.auth();