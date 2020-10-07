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
  if (!doc.exists || !doc.data().admin) {
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
  return doc.exists && doc.data().admin;
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

exports.getUsers = functions.https.onCall(async (data, context) => {
  await checkAuth(context.auth);
  let uids = data.uids;
  let users = {};
  let notFound = [];
  for (let i = 0; i < uids.length; i += 100) {
    let endIndex = i + 100 <= uids.length ? i + 100 : uids.length;
    let getUsersResult = await admin.auth().getUsers(uids.slice(i, endIndex).map((uid) => ({ uid }))).catch(throwError);
    for (let user of getUsersResult.users) {
      users[user.uid] = user.email;
    }
    notFound.concat(getUsersResult.notFound.map(({ uid }) => uid));
  }
  return {
    users,
    notFound
  };
});