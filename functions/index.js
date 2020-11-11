const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const throwError = (error) => {
  console.error(error);
  throw new functions.https.HttpsError(error.code, error.message);
};

const isAdmin = async (uid) => {
  let doc = await admin.firestore()
    .collection("userData")
    .doc(uid).get()
    .catch(throwError);
  if (!doc.exists || !(doc.data().accountType === "OWNER" || doc.data().accountType === "ADMIN")) {
    throw new functions.https.HttpsError("permission-denied", "User is not an admin");
  }
}

const checkAuth = async (auth) => {
  if (!auth) {
    throw new functions.https.HttpsError("permission-denied", "User is not signed in");
  }
  await isAdmin(auth.uid);
};

const deleteUserData = async (uid) => {
  await admin.firestore().collection("userData").doc(uid).delete().catch(throwError);
  console.log("Successfully deleted user data for " + uid);
}

exports.checkIsAdmin = functions.https.onCall( async (data, context) => {
  let { uid } = await admin.auth().getUserByEmail(data.email).catch(throwError);
  let doc = await admin.firestore()
    .collection("userData")
    .doc(uid).get()
    .catch(throwError);
  return doc.exists && (doc.data().accountType === "OWNER" || doc.data().accountType === "ADMIN");
});

exports.deleteUsers = functions.https.onCall(async (data, context) => {
  await checkAuth(context.auth);
  let uids = data.uids;
  let deleteUsersResult = await admin.auth().deleteUsers(uids).catch(throwError);
  console.log("Successfully deleted " + deleteUsersResult.successCount + " users");
  console.log("Failed to delete " +  deleteUsersResult.failureCount + " users");
  deleteUsersResult.errors.forEach((error) => {
    console.error(error);
  });
  let errorIndexes = deleteUsersResult.errors.map(({ index }) => index);
  for (let i = 0; i < uids.length; i++) {
    if (!errorIndexes.includes(i)) {
      try {
        await deleteUserData(uids[i]);
      } catch (e) {
        console.error(e);
      }
    }
  }
  return deleteUsersResult;
});

exports.listAllUsers = functions.https.onCall(async (data, context) => {
  await checkAuth(context.auth);
  // Assume that there are no more than 1000 users
  let listUsersResult = await admin.auth().listUsers(1000).catch(throwError);
  let users = {};
  listUsersResult.users.forEach(({ uid, email }) => {
    users[uid] = { email };
  })
  return users;
});

exports.setEmail = functions.https.onCall(async (data, context) => {
  await checkAuth(context.auth);
  let uid = data.uid;
  await admin.auth().updateUser(uid, { email: data.email }).catch(throwError);
});

exports.resetPasswords = functions.https.onCall(async (data, context) => {
  await checkAuth(context.auth);
  let uids = data.uids;
  let doc = await admin.firestore().collection("appData").doc("defaultUser").get().catch(throwError);
  let password = doc.data().password;
  try {
    await Promise.all(uids.map((uid) => admin.auth().updateUser(uid, { password })));
    console.log("Successfully reset " + uids.length + " passwords to '" + password + "'.");
    return password;
  } catch (e) {
    throwError(e);
  }
});