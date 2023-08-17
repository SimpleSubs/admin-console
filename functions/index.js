const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {
  batchWrite,
  arrsToObject,
  collectionToObject,
  AccountTypes,
  AccountTypesPriority,
  Actions,
  Permissions
} = require("./helpers");

admin.initializeApp();

const firestore = admin.firestore();

const domainDoc = (domain) => firestore.collection("domains").doc(domain);
const userDataCollection = (domain) => domainDoc(domain).collection("userData");
const userDataDoc = (domain, uid) => userDataCollection(domain).doc(uid);
const userDomainDoc = (uid) => firestore.collection("userDomains").doc(uid);
const appDataCollection = (domain) => domainDoc(domain).collection("appData");
const userFieldsDoc = (domain) => appDataCollection(domain).doc("userFields");
const orderCountDoc = (domain) => domainDoc(domain).collection('orderCount')
const ordersDoc = (domain) => domainDoc(domain).collection('orders')

const httpsError = ({code = 'internal', message = 'An unknown error occurred.'}) => {
  return new functions.https.HttpsError(code, message);
};

const getAdminDomains = async (uid, myDomain = null) => {
  const domainData = (await userDomainDoc(uid).get()).data();
  let domains = domainData.domains || [domainData.domain];
  if (myDomain) {
    if (!domains.includes(myDomain)) {
      throw httpsError({ code: "permission-denied", message: "User is not an admin" });
    } else {
      domains = [myDomain];
    }
  }
  const dataWhereAdmin = {};
  await Promise.all(domains.map((domain) =>
    userDataDoc(domain, uid).get()
      .then((doc) => {
        const data = doc.data();
        if (doc.exists && data.accountType !== AccountTypes.USER) {
          dataWhereAdmin[domain] = data.accountType;
        }
      }).catch((e) => {
        throw httpsError({code: 'internal', message: e.message});
      })
  ));
  if (Object.keys(dataWhereAdmin).length === 0) {
    throw httpsError({ code: "permission-denied", message: "User is not an admin" });
  } else {
    return dataWhereAdmin;
  }
}

const getDomains = async () => {
  let domainsSnapshot = await firestore.collection("userDomains").get();
  let domainsObj = {};
  for (let doc of domainsSnapshot.docs) {
    domainsObj[doc.id] = doc.data().domains || [doc.data().domain] || [];
  }
  return domainsObj;
};

const getAccountTypes = async (domain) => {
  let userDataSnapshot = await userDataCollection(domain).get();
  let accountTypes = {};
  for (let doc of userDataSnapshot.docs) {
    accountTypes[doc.id] = doc.data().accountType;
  }
  return accountTypes;
};

const isEditable = (adminAccountType, editingAccountType, actions, adminUid, editingUid) => {
  // the user's own account is editable as long as they're not deleting it
  if (adminUid && editingUid && adminUid === editingUid) {
    return !actions.has(Actions.DELETING);
  } else {
    // admin user must be able to perform all given actions on user being edited
    for (let action of actions) {
      if (Permissions[adminAccountType][action] < AccountTypesPriority[editingAccountType]) {
        return false;
      }
    }
    return true;
  }
};

const getEditableUids = async (auth, accountType, uids, domain, actions) => {
  const actionsSet = new Set(actions);
  let editableUids = [];
  let uneditableUids = [];
  if (uids.length > 0) {
    const userDomains = await getDomains();
    const accountTypes = await getAccountTypes(domain);
    for (let uid of uids) {
      if (!userDomains[uid].includes(domain)) {
        throw httpsError({ code: "permission-denied", message: "Cannot edit users outside of domain" });
      }
      if (isEditable(accountType, accountTypes[uid], actionsSet, auth.uid, uid)) {
        editableUids.push(uid);
      } else {
        uneditableUids.push(uid);
      }
    }
  }
  return { editableUids, uneditableUids };
}

// Users may edit their own accounts but not delete them
const checkAuth = async (auth, domain, uids = [], actions = []) => {
  if (!auth) {
    throw httpsError({ code: "permission-denied", message: "User is not signed in" });
  } else if (!domain) {
    throw httpsError({ code: "invalid-argument", message: "Provided organization key is invalid" });
  }
  const adminDomainMap = await getAdminDomains(auth.uid, domain);
  const accountType = adminDomainMap[domain];
  try {
    let editableUidsResult = await getEditableUids(auth, accountType, uids, domain, actions);
    return { accountType, ...editableUidsResult };
  } catch (e) {
    throw httpsError({code: 'internal', message: e.message});
  }
};

const deleteUserData = async (uids, domain, errorIndexes) => {
  let uidsToDelete = uids.filter((value, i) => !errorIndexes.includes(i));
  let refsToDelete = uidsToDelete.map((uid) => userDataDoc(domain, uid));
  await batchWrite(refsToDelete, (batch, ref) => batch.delete(ref), firestore, httpsError);
};

exports.checkIsAdmin = functions.https.onCall( async (data) => {
  try {
    let { uid } = await admin.auth().getUserByEmail(data.email);
    return Object.keys(await getAdminDomains(uid));
  } catch (e) {
    return null;
  }
});

exports.deleteUsers = functions.https.onCall(async (data, context) => {
  const { domain, uids } = data;
  const { editableUids, uneditableUids } = await checkAuth(context.auth, domain, uids, [Actions.DELETING]);
  let deleteUsersResult = await admin.auth().deleteUsers(editableUids).catch((e) => {
    throw httpsError({code: 'internal', message: e.message});
  });
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
  const domain = data.domain;
  await checkAuth(context.auth, domain);
  // Assume that there are no more than 1000 users
  let listUsersResult = await admin.auth().listUsers(1000).catch((e) => {
    throw httpsError({code: 'internal', message: e.message});
  });
  let userDomains = await getDomains();
  let users = {};
  for (let user of listUsersResult.users) {
    let userDomain = userDomains[user.uid];
    if (userDomain?.includes(domain)) {
      users[user.uid] = { email: user.email };
    }
  }
  return users;
});

const getOrderCount = async (domain, date) => {
  let orderCount = await orderCountDoc(domain).doc(date).get();
  return orderCount.data()?.count || 0;
}

const incOrderCount = async (domain, date) => await orderCountDoc(domain).doc(date).set({count: admin.firestore.FieldValue.increment(1)}, {merge: true});
const decOrderCount = async (domain, date) => await orderCountDoc(domain).doc(date).set({count: admin.firestore.FieldValue.increment(-1)}, {merge: true});

const getOrderLimit = async (domain) => {
  const dDoc = await domainDoc(domain).get();
  const orderLimit = dDoc.data()?.orderLimit;
  if (!orderLimit) console.log('ORDER LIMIT MISSING');
  return orderLimit;
}

exports.orderCountListener = functions.firestore.document('domains/{domain}/orders/{orderId}').onWrite((change, context) => {
  if (!change.before.exists) incOrderCount(context.params.domain, change.after.data()?.date);
  else if (change.before.exists && change.after.exists) null;
  else if (!change.after.exists) decOrderCount(context.params.domain, change.before.data()?.date);
  return true;
});

exports.createOrder = functions.https.onCall(async (data, context) => {
  const {domain, uid, sandwich} = data;
  if (!domain || !uid || !sandwich || !sandwich.date) throw httpsError({ code: "invalid-argument", message: "You did not provide the required arguments" });

  if (!context.auth) throw httpsError({ code: "permission-denied", message: "User is not signed in" });

  const orderCount = await getOrderCount(domain, sandwich.date);
  const orderLimit = await getOrderLimit(domain);
  if (orderCount >= orderLimit) throw httpsError({ code: "unavailable", message: "The daily sandwich order limit has been reached.",  type: 'order-limit-reached'});

  const orderData = {...sandwich, date: sandwich.date, uid}
  await ordersDoc(domain).doc().set(orderData);

  return true;
})


exports.getUser = functions.https.onCall(async (data, context) => {
  try {
    let { uid } = await admin.auth().getUserByEmail(data.email);
    return uid;
  } catch (e) {
    if (e.code === "auth/user-not-found") {
      return null;
    } else {
      throw httpsError({code: 'internal', message: e.message});
    }
  }
})

exports.setEmail = functions.https.onCall(async (data, context) => {
  const { domain, uid, email } = data;
  const { editableUids } = await checkAuth(context.auth, domain, [uid], [Actions.EDITING]);
  if (editableUids.length === 0) {
    throw httpsError({ code: "permission-denied", message: "You do not have permission to edit this user" });
  }
  await admin.auth().updateUser(uid, { email }).catch((e) => {
    throw httpsError({code: 'internal', message: e.message});
  });
});

exports.resetPasswords = functions.https.onCall(async (data, context) => {
  const { domain, uids } = data;
  const { editableUids, uneditableUids } = await checkAuth(context.auth, domain, uids, [Actions.EDITING]);
  try {
    let doc = await firestore.collection("domains").doc(domain)
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
    throw httpsError({code: 'internal', message: e.message});
  }
});

exports.deleteFailedUser = functions.https.onCall(async (data, context) => {
  const uid = data.uid;
  if (context.auth.uid !== uid) {
    throw httpsError({ code: "permission-denied", message: "You must be logged into the account to delete it." });
  } else if (!data.domain) {
    throw httpsError({ code: "invalid-argument", message: "Provided organization key is invalid" });
  }
  try {
    const docRef = userDomainDoc(uid);
    let doc = await docRef.get();
    let domains = doc.data()?.domains || [doc.data()?.domain] || [];
    if (doc.exists && domains.includes(data.domain)) {
      throw httpsError({ code: "permission-denied", message: "You cannot delete a successfully created account." });
    } else if (doc.exists && domains.length > 1) {
      await docRef.update({ domains: domains.filter((domain) => domain !== data.domain) });
    } else {
      if (doc.exists) {
        await docRef.delete();
      }
      await admin.auth().deleteUser(uid);
    }
  } catch (e) {
    throw httpsError({code: 'internal', message: e.message});
  }
});

exports.updateDomainData = functions.https.onCall(async (data, context) => {
  const { id } = data;
  await checkAuth(context.auth, id);
  try {
    await firestore.collection("domains").doc(id).set(data.data);
  } catch (e) {
    throw httpsError({code: 'internal', message: e.message});
  }
});

const getUserFieldsObj = async (domain) => {
  try {
    const rawUserFields = (await userFieldsDoc(domain).get()).data();
    let userFieldsObj = {};
    for (let { key, ...field } of Object.values(rawUserFields)) {
      userFieldsObj[key] = field;
    }
    return userFieldsObj;
  } catch (e) {
    throw httpsError({code: 'internal', message: e.message});
  }
};

const validateImportData = async (data, domain) => {
  const accountTypeValues = Object.values(AccountTypes);
  const userFields = await getUserFieldsObj(domain);
  let validUserData = {};

  for (let email of Object.keys(data)) {
    let { accountType, ...profileData } = data[email];
    let validProfileData = {};
    // Makes sure account type is valid
    if (accountType) {
      accountType = accountType.toUpperCase();
      if (!accountTypeValues.includes(accountType)) {
        throw httpsError({
          code: "invalid-argument",
          message: "All specified fields for accountType must be one of 'USER', 'ADMIN', or 'OWNER'."
        });
      }
      validProfileData.accountType = accountType;
    }
    // Checks that all provided columns are valid user fields and that picker fields contain valid data
    for (let key of Object.keys(profileData)) {
      let userField = userFields[key];
      let profileField = profileData[key];
      if (userField && (userField.inputType !== "PICKER" || userField.options.includes(profileField))) {
        validProfileData[key] = profileData[key];
      }
    }
    validUserData[email] = validProfileData;
  }

  return validUserData;
};

// TODO: enable multiple domain functionality
const getUsersByEmail = async (domain, emails) => {
  let query = emails.map((email) => ({ email }));
  let getUsersResult = await admin.auth().getUsers(query);
  let userDomains = await getDomains();
  let notFound = getUsersResult.notFound.map(({ email }) => email);
  let foundArr = getUsersResult.users;

  for (let { uid } of foundArr) {
    if (!userDomains[uid].includes(domain)) {
      throw httpsError({ code: "permission-denied", message: "Cannot edit users outside of domain" });
    }
  }

  let found = arrsToObject(foundArr.map(({ email }) => email), foundArr.map(({ uid }) => uid));
  return {
    found,
    notFound
  }
}

const createUsers = async (emails, domain) => {
  let defaultPassword = (
    await admin
      .firestore()
      .collection("domains")
      .doc(domain)
      .collection("appData")
      .doc("defaultUser")
      .get()
  ).data().defaultPassword;
  let errors = [];
  let newUsersArr = (await Promise.all(emails.map((email) => (
    admin.auth().createUser({ email, password: defaultPassword })
      .then(({ uid, email }) => ({ uid, email }))
      .catch((error) => {
        errors.push(error);
        return null;
      })
  )))).filter((result) => !!result);
  await batchWrite(
    newUsersArr.map(({ uid }) => userDomainDoc(uid)),
    (batch, ref) => batch.set(ref, { domain }),
    firestore,
    (error) => errors.push(error)
  );
  let newUsers = arrsToObject(newUsersArr.map(({ email }) => email), newUsersArr.map(({ uid }) => uid));
  return { newUsers, errors };
}

// Emails are lowered when creating users in firebase, so this lowers all the provided emails so they still match
const lowerKeys = (obj) => {
  let loweredObj = {};
  for (let key of Object.keys(obj)) {
    loweredObj[key.toLowerCase()] = obj[key];
  }
  return loweredObj;
};

const getDefaultUser = async (domain) => {
  let defaultUserDoc = await admin
    .firestore()
    .collection("domains")
    .doc(domain)
    .collection("appData")
    .doc("defaultUser")
    .get();
  let data = defaultUserDoc.data();
  delete data.password;
  return data;
};

const intersection = (setA, setB, ...extraSets) => {
  let _intersection = new Set();
  for (let elem of setB) {
    if (setA.has(elem)) {
      _intersection.add(elem)
    }
  }
  if (extraSets.length === 0) {
    return _intersection;
  }
  return intersection(_intersection, ...extraSets);
};

// Quick fix; clean up later
const getTypeFromPriority = (priority) => (
  Object.keys(AccountTypesPriority).filter((accountType) => AccountTypesPriority[accountType] === priority)[0]
);

const getAccountType = (admin, from = AccountTypes.USER, to = AccountTypes.USER, existing) => {
  // Do not change account type if admin doesn't have deleting permissions
  if (existing && !isEditable(admin, from, new Set([Actions.DELETING]))) {
    return from;
  // If admin cannot create `to` account type, change account type to highest permission that admin has
  } else if (!isEditable(admin, to, new Set([Actions.CREATING]))) {
    return getTypeFromPriority(Permissions[admin][Actions.CREATING]);
  }
  // If admin has no auth issues, account type should be what was requested
  return to;
};

// TODO: Allow import existing user into a different domain
exports.importUsers = functions.https.onCall(async (data, context) => {
  const { domain } = data;
  const { accountType } = await checkAuth(context.auth, domain);
  let userData = await validateImportData(lowerKeys(data.userData), domain);
  let { found, notFound } = await getUsersByEmail(domain, Object.keys(userData));
  let { newUsers, errors } = await createUsers(notFound, domain);
  let { editableUids } = await getEditableUids(context.auth, accountType, Object.values(found), domain, [Actions.EDITING]);
  let foundUserData = collectionToObject(await userDataCollection(domain).get());
  let allUsers = { ...found, ...newUsers };

  let defaultUser = await getDefaultUser(domain);
  // Keep track of found users that are updated (for result reporting)
  let updated = {};

  // Include whether email is found/not found in userData (to reference permissions when writing data)
  for (let email of Object.keys(found)) {
    let uid = found[email];
    // Only update existing users that admin has permissions to edit
    if (editableUids.includes(uid)) {
      userData[email] = { ...userData[email], existing: true };
      updated[email] = uid;
    }
  }
  for (let email of Object.keys(newUsers)) {
    userData[email] = { ...userData[email], existing: false };
  }

  // Write user domain data (only need to use notFound since domain data is already written for found)
  await batchWrite(
    Object.keys(notFound),
    (batch, email) => batch.set(userDomainDoc(allUsers[email]), { domain }),
    firestore,
    (error) => errors.push(error)
  );
  // Write user profile data
  await batchWrite(
    Object.keys(allUsers),
    (batch, email) => {
      let thisUid = allUsers[email];
      let thisData = { ...userData[email] };
      // Copy over existing data if it exists, then overwrite with imported data
      if (thisData.existing) {
        thisData = { ...foundUserData[thisUid], ...thisData }
      } else {
        thisData = { ...defaultUser, ...thisData }
      }
      // User cannot change their own acct permissions
      if (thisUid === context.auth.uid) {
        thisData.accountType = foundUserData[thisUid].accountType;
      } else {
        thisData.accountType = getAccountType(
          accountType,
          foundUserData[thisUid]?.accountType,
          thisData.accountType,
          thisData.existing
        );
      }
      delete thisData.existing;
      return batch.set(userDataDoc(domain, thisUid), thisData);
    },
    firestore,
    (error) => errors.push(error)
  );
  return {
    updated,
    created: newUsers,
    errors
  };
});

exports.getAllDomainData = functions.https.onCall(async (data, context) => {
  try {
    const adminDomains = Object.keys(await getAdminDomains(context.auth.uid));
    const docs = await Promise.all(adminDomains.map((domain) => domainDoc(domain).get().catch((e) => {
      throw httpsError({code: 'internal', message: e.message});
    })));
    return docs
      .filter((doc) => doc.exists)
      .map((doc) => ({ ...doc.data(), id: doc.id }));
  } catch (e) {
    throw httpsError({code: 'internal', message: e.message});
  }
});
