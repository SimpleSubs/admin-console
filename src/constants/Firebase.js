import firebase from "firebase/app";
import "firebase/firestore";
import "firebase/auth";
import "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBIV-fwIGwS9sNbGxHH_kCTbx_BbpAJC2s",
  authDomain: "sandwich-orders.firebaseapp.com",
  databaseURL: "https://sandwich-orders.firebaseio.com",
  projectId: "sandwich-orders",
  storageBucket: "sandwich-orders.appspot.com",
  messagingSenderId: "940239502337",
  appId: "1:940239502337:web:5de6bf8f976d3fb1f65400"
};

firebase.initializeApp(firebaseConfig);

export const executeFunction = async (name, data) => {
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