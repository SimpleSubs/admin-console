const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const throwError = (error) => {
  console.error(error);
  throw new functions.https.HttpsError(error.code, error.message);
};

const isAdmin = async (uid) => {
  let domain = (await admin.firestore().collection("userDomains").doc(uid).get()).data().domain;
  let doc = await admin.firestore()
    .collection("domains")
    .doc(domain)
    .collection("userData")
    .doc(uid).get()
    .catch(throwError);
  if (!doc.exists || !(doc.data().accountType === "OWNER" || doc.data().accountType === "ADMIN")) {
    throwError({ code: "permission-denied", message: "User is not an admin" });
  } else {
    return domain;
  }
}

const getDomains = async () => {
  let domainsSnapshot = await admin.firestore().collection("userDomains").get();
  let domainsObj = {};
  for (let doc of domainsSnapshot.docs) {
    domainsObj[doc.id] = doc.data().domain;
  }
  return domainsObj;
}

const checkAuth = async (auth, uids) => {
  if (!auth) {
    throwError({ code: "permission-denied", message: "User is not signed in" });
  }
  const domain = await isAdmin(auth.uid);
  if (uids && uids.length > 0) {
    const userDomains = await getDomains();
    for (let uid of uids) {
      if (userDomains[uid] !== domain) {
        throwError({ code: "permission-denied", message: "Cannot edit users outside of domain" });
      }
    }
  }
  return domain;
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
  let uids = data.uids;
  await checkAuth(context.auth, uids);
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
  const domain = await checkAuth(context.auth, []);
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
  await checkAuth(context.auth, [data.uid]);
  let uid = data.uid;
  await admin.auth().updateUser(uid, { email: data.email }).catch(throwError);
});

exports.resetPasswords = functions.https.onCall(async (data, context) => {
  await checkAuth(context.auth, data.uids);
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

// const migrateCollection = async (srcCollection, destCollection, data = (doc) => doc, deleteAfter = false, condition = null) => {
//   const documents = await srcCollection.get();
//   let writeBatch = admin.firestore().batch();
//   let i = 0;
//   try {
//     for (const doc of documents.docs) {
//       if (condition) {
//         if (condition(doc.data())) {
//           writeBatch.set(destCollection.doc(doc.id), data(doc.data()));
//           i++;
//           if (deleteAfter) {
//             writeBatch.delete(doc.ref);
//             i++;
//           }
//         }
//       } else {
//         writeBatch.set(destCollection.doc(doc.id), data(doc.data()));
//         i++;
//         if (deleteAfter) {
//           writeBatch.delete(doc.ref);
//           i++;
//         }
//       }
//       if (i > 400) {  // write batch only allows maximum 500 writes per batch
//         i = 0;
//         console.log("Intermediate committing of batch operation");
//         await writeBatch.commit();
//         writeBatch = admin.firestore().batch();
//       }
//     }
//     if (i > 0) {
//       console.log("Firebase batch operation completed. Doing final committing of batch operation.");
//       await writeBatch.commit();
//     } else {
//       console.log("Firebase batch operation completed.");
//     }
//   } catch (e) {
//     console.error(e);
//     console.log("Number of operations: " + i);
//   }
// }
//
// exports.migrateToDomains = functions.https.onCall(async (data, context) => {
//   const lwhsCollection = admin.firestore().collection("domains").doc("lwhs").collection("userData");
//   const userDataCollection = admin.firestore().collection("userData");
//   await migrateCollection(userDataCollection, lwhsCollection);
//   await migrateCollection(userDataCollection, admin.firestore().collection("userDomains"), () => ({ domain: "lwhs" }));
//
//   const snapshot = await userDataCollection.get();
//   for (const doc of snapshot.docs) {
//     await migrateCollection(userDataCollection.doc(doc.id).collection("myPresets"), lwhsCollection.doc(doc.id).collection("myPresets"));
//   }
// });
//
// exports.migrateToAnalytics = functions.https.onCall(async (data, context) => {
//   const ordersCollection = admin.firestore().collection("allOrders");
//   const analyticsCollection = admin.firestore().collection("domains").doc("lwhs").collection("pastOrders");
//   await migrateCollection(ordersCollection, analyticsCollection, null, true);
// });
//
// exports.migrateToExample = functions.https.onCall(async (data, context) => {
//   const lwhsCollection = admin.firestore().collection("domains)").doc("example").collection("userData");
//   const exampleCollection = admin.firestore().collection("domains").doc("example").collection("userData");
//   await migrateCollection(lwhsCollection, exampleCollection, null, true, ({ name }) => (name === "MIT Admissions" || name === "Harvard Admissions" || name === "Jane Doe"));
// })
//
// exports.mapAcross = functions.https.onCall(async (data, context) => {
//   const col = admin.firestore().collection("domains").doc("lwhs").collection("pastOrders");
//   const deleteUid = (data) => {
//     let newData = { ...data };
//     delete newData.key;
//     return newData;
//   }
//   await migrateCollection(col, col, deleteUid);
// });