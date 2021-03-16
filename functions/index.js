const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { batchWrite } = require("./helpers");

admin.initializeApp();

const userDataCollection = (domain, uid) => (
  admin.firestore()
    .collection("domains")
    .doc(domain)
    .collection("userData")
    .doc(uid)
);

const throwError = (error) => {
  console.error(error);
  throw new functions.https.HttpsError(error.code, error.message);
};

const isAdmin = async (uid) => {
  let domain = (await admin.firestore().collection("userDomains").doc(uid).get()).data().domain;
  let doc = await userDataCollection(domain, uid).get().catch(throwError);
  let accountType = doc.data().accountType;
  if (!doc.exists || !(accountType === "OWNER" || accountType === "ADMIN")) {
    throwError({ code: "permission-denied", message: "User is not an admin" });
  } else {
    return { domain, accountType };
  }
}

const getDomains = async () => {
  let domainsSnapshot = await admin.firestore().collection("userDomains").get();
  let domainsObj = {};
  for (let doc of domainsSnapshot.docs) {
    domainsObj[doc.id] = doc.data().domain;
  }
  return domainsObj;
};

const getAccountTypes = async (domain) => {
  let userDataSnapshot = await admin.firestore()
    .collection("domains")
    .doc(domain)
    .collection("userData")
    .get();
  let accountTypes = {};
  for (let doc of userDataSnapshot.docs) {
    accountTypes[doc.id] = doc.data().accountType;
  }
  return accountTypes;
};

// Users may edit their own accounts but not delete them
const checkAuth = async (auth, uids, deleting = false) => {
  if (!auth) {
    throwError({ code: "permission-denied", message: "User is not signed in" });
  }
  const { domain, accountType } = await isAdmin(auth.uid);
  let editableUids = [];
  let uneditableUids = [];
  if (uids && uids.length > 0) {
    const userDomains = await getDomains();
    const accountTypes = await getAccountTypes(domain);
    for (let uid of uids) {
      if (userDomains[uid] !== domain) {
        throwError({ code: "permission-denied", message: "Cannot edit users outside of domain" });
      }
      if (
        (uid === auth.uid && !deleting) || // own user's account is editable as long as they're not deleting it
        (accountType === "ADMIN" && accountTypes[uid] === "USER") || // can edit any USERs as admin
        (accountType === "OWNER" && accountTypes[uid] !== "OWNER") // can edit any ADMINs or USERs as owner
      ) {
        editableUids.push(uid);
      } else {
        uneditableUids.push(uid)
      }
    }
  }
  return { domain, editableUids, uneditableUids };
};

const deleteUserData = async (uids, domain, errorIndexes) => {
  let uidsToDelete = uids.filter((value, i) => !errorIndexes.includes(i));
  let refsToDelete = uidsToDelete.map((uid) => userDataCollection(domain, uid));
  await batchWrite(refsToDelete, (batch, ref) => batch.delete(ref), admin.firestore(), throwError);
};

exports.checkIsAdmin = functions.https.onCall( async (data, context) => {
  try {
    let { uid } = await admin.auth().getUserByEmail(data.email);
    await isAdmin(uid);
    return true;
  } catch (e) {
    return false;
  }
});

exports.deleteUsers = functions.https.onCall(async (data, context) => {
  const uids = data.uids;
  const { domain, editableUids, uneditableUids } = await checkAuth(context.auth, uids, true);
  let deleteUsersResult = await admin.auth().deleteUsers(editableUids).catch(throwError);
  console.log("Successfully deleted " + deleteUsersResult.successCount + " users");
  console.log("Failed to delete " + (deleteUsersResult.failureCount + uneditableUids.length) + " users");
  deleteUsersResult.errors.forEach((error) => {
    console.error(error);
  });
  let errorIndexes = deleteUsersResult.errors.map(({ index }) => index);
  await deleteUserData(editableUids, domain, errorIndexes);
  return { errors: deleteUsersResult.errors, uneditableUids };
});

exports.listAllUsers = functions.https.onCall(async (data, context) => {
  const { domain } = await checkAuth(context.auth, []);
  // Assume that there are no more than 1000 users
  let listUsersResult = await admin.auth().listUsers(1000).catch(throwError);
  let userDomains = await getDomains();
  let users = {};
  for (let user of listUsersResult.users) {
    let userDomain = userDomains[user.uid];
    if (userDomain === domain) {
      users[user.uid] = { email: user.email };
    }
  }
  return users;
});

exports.setEmail = functions.https.onCall(async (data, context) => {
  let uid = data.uid;
  const { editableUids } = await checkAuth(context.auth, [data.uid]);
  if (editableUids.length === 0) {
    throwError({ code: "permission-denied", message: "You do not have permission to edit this user" });
  }
  await admin.auth().updateUser(uid, { email: data.email }).catch(throwError);
});

exports.resetPasswords = functions.https.onCall(async (data, context) => {
  const { domain, editableUids, uneditableUids } = await checkAuth(context.auth, data.uids, false);
  try {
    let doc = await admin.firestore().collection("domains").doc(domain)
      .collection("appData").doc("defaultUser")
      .get();
    let password = doc.data().password;
    let success = [];
    let failed = [...uneditableUids];
    await Promise.all(editableUids.map((uid) => (
      admin.auth().updateUser(uid, { password })
        .then(() => success.push(uid))
        .catch(() => failed.push(uid))
    )));
    console.log(`Successfully reset ${success.length} passwords to '${password}'.`);
    console.log(`Failed to reset ${failed.length} passwords.`);
    return { password, success, failed };
  } catch (e) {
    throwError(e);
  }
});

exports.deleteFailedUser = functions.https.onCall(async (data, context) => {
  const uid = data.uid;
  if (context.auth.uid !== uid) {
    throwError({ code: "permission-denied", message: "You must be logged into the account to delete it." });
  }
  try {
    const docRef = admin.firestore().collection("userDomains").doc(uid);
    let doc = await docRef.get();
    if (doc.exists && doc.data().domain) {
      throwError({ code: "permission-denied", message: "You cannot delete a successfully created account." })
    } else if (doc.exists) {
      await docRef.delete();
    }
    await admin.auth().deleteUser(uid);
  } catch (e) {
    throwError(e);
  }
});

exports.updateDomainData = functions.https.onCall(async (data, context) => {
  const { domain } = await checkAuth(context.auth);
  if (domain !== data.id) {
    throwError({ code: "permission-denied", message: "You may only edit data for your own organization." });
  }
  try {
    await admin.firestore().collection("domains").doc(data.id).set(data.data);
  } catch (e) {
    throwError(e);
  }
});

exports.getUsersByEmail = functions.https.onCall(async (data, context) => {
  const { domain } = await checkAuth(context.auth);
  let query = data.emails.map((email) => ({ email }));
  let getUsersResult = await admin.auth().getUsers(query);
  let userDomains = await getDomains();
  let notFound = getUsersResult.notFound.map(({ email }) => email);
  let found = {};
  let differentDomain = [];
  for (let user of getUsersResult.users) {
    if (userDomains[user.uid] === domain) {
      found[user.email] = user.uid;
    } else {
      differentDomain.push(user.email);
    }
  }
  return {
    found,
    notFound,
    differentDomain
  }
});