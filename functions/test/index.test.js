const { v4: uuid } = require('uuid');

const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const { assert } = chai;

const admin = require("firebase-admin");
const {
  batchWrite,
  arrsToObject,
  collectionToObject,
  AccountTypesPriority,
  Actions,
  Permissions
} = require("../helpers");

// Initialize test with config data and service account key
const test = require("firebase-functions-test")({
  apiKey: "AIzaSyCxaTYBJiLAqNC2H0ZU0DtnpFWqBTrbTmI",
  authDomain: "simplesubs-testing.firebaseapp.com",
  projectId: "simplesubs-testing",
  storageBucket: "simplesubs-testing.appspot.com",
  messagingSenderId: "924437073648",
  appId: "1:924437073648:web:787848118c2bea10f43c35",
  measurementId: "G-7MYB8YY50N"
}, "serviceAccountKey.json");

const sampleUids = {
  user: "kuItb8RrHTf8c1rMfZrFdMar4LJ2",
  admin: "wCDqvcI0g5Y5OtRwj9y2gDfz2ku2",
  owner: "trpm5sZZ7Ce8IrkjplhYbfPLpxq1"
};

const defaultUserData = { password: "defaultPassword" };
const testDomain = "test";
const invalidTestDomain = "cantTouchThis";
let firestore;

const userDataCollection = (domain) => (
  firestore
    .collection("domains")
    .doc(domain)
    .collection("userData")
);

const userDataDoc = (domain, uid) => userDataCollection(domain).doc(uid);
const userDomainsCollection = () => firestore.collection("userDomains");
const userDomainDoc = (uid) => userDomainsCollection().doc(uid);

const generateRandomString = (length) => Math.random().toString(20).substr(2, length);
const generateRandomInteger = (lowerBound, upperBound) => (
  Math.floor(Math.random() * (upperBound - lowerBound)) + lowerBound
);

const isSubset = (superset, subset) => {
  if (!(superset && subset && typeof superset === "object" && typeof subset === "object")) {
    return false;
  }
  for (let key of Object.keys(subset)) {
    if (subset[key] !== superset[key]) {
      return false;
    }
  }
  return true;
}

const allAreSubset = (superObj, subObj) => {
  for (let key of Object.keys(subObj)) {
    if (!isSubset(superObj[key], subObj[key])) {
      return false;
    }
  }
  return true;
}

const makeTestUsers = async (domain, users) => {
  let usersWithEmail = users.map((user) => ({
    ...user,
    email: user.email || `${generateRandomString(6)}@simple-subs.com`
  }));
  let usersWithUids = usersWithEmail.map((user) => ({ ...user, uid: uuid() }));
  await admin.auth().importUsers(usersWithUids.map(({ uid, email }) => ({ uid, email })));
  const writeUserData = (batch, data) => {
    let dataToPush = { ...data };
    delete dataToPush.email;
    delete dataToPush.uid;
    batch.set(userDataDoc(domain, data.uid), dataToPush);
  };
  const writeDomainData = (batch, data) => {
    batch.set(userDomainDoc(data.uid), { domain });
  }
  await batchWrite(usersWithUids, writeUserData, firestore, console.error);
  await batchWrite(usersWithUids, writeDomainData, firestore, console.error);
  return arrsToObject(usersWithUids.map(({ uid }) => uid), usersWithEmail);
};

const generateUserData = async (domain, userCount) => {
  let users = [];
  for (let i = 0; i < userCount; i++) {
    users.push({
      accountType: ["ADMIN", "OWNER", "USER"][generateRandomInteger(0, 3)]
    });
  }
  return await makeTestUsers(domain, users);
};

// Assuming no more than 1000 users
const cleanUpUserAccounts = async (domain, userDomains, uidsToKeep) => {
  let allUids = (await admin.auth().listUsers()).users.map(({ uid }) => uid);
  let uidsToDelete = allUids.filter((uid) => (
    !uidsToKeep.includes(uid) && (!userDomains[uid] || userDomains[uid].domain === domain)
  ));
  await admin.auth().deleteUsers(uidsToDelete);
};

const cleanUpUserData = async (domain, uidsToKeep) => {
  let allUids = (await userDataCollection(domain).get()).docs?.map((doc) => doc.id) || [];
  let uidsToDelete = allUids.filter((uid) => !uidsToKeep.includes(uid));
  await batchWrite(
    uidsToDelete.map((uid) => userDataDoc(domain, uid)),
    (batch, ref) => batch.delete(ref),
    firestore
  );
};

const cleanUpUserDomains = async (domain, userDomains, uidsToKeep) => {
  let uidsToDelete = Object.keys(userDomains).filter((uid) => (
    !uidsToKeep.includes(uid) && userDomains[uid].domain === domain
  ));
  await batchWrite(
    uidsToDelete.map((uid) => userDomainDoc(uid)),
    (batch, ref) => batch.delete(ref),
    firestore
  );
};

const cleanUpUsers = async (domain) => {
  let userDomains = collectionToObject(await userDomainsCollection().get());
  let uidsToKeep = Object.values(sampleUids);

  // Must do all three separately in case a previous delete action was skipped/didn't work
  await cleanUpUserAccounts(domain, userDomains, uidsToKeep);
  await cleanUpUserData(domain, uidsToKeep);
  await cleanUpUserDomains(domain, userDomains, uidsToKeep);
};

const checkDomains = async (domain, uids) => {
  let querySnapshot = await userDomainsCollection().where(admin.firestore.FieldPath.documentId(), "in", uids);
  for (let doc of querySnapshot.docs) {
    if (doc.data().domain !== domain) {
      return false;
    }
  }
  return true;
};

describe("Firebase functions", function() {
  let myFunctions = require("../index.js");

  this.timeout(7500);

  before(function() {
    firestore = admin.firestore();
  });

  after(function() {
    test.cleanup();
  });

  describe("checkIsAdmin", async function() {
    const wrapped = test.wrap(myFunctions.checkIsAdmin);

    it("should return true when accountType is ADMIN", function() {
      let data = { email: "admin@simple-subs.com" };
      return assert.eventually.isTrue(wrapped(data));
    });

    it("should return true when accountType is OWNER", function() {
      let data = { email: "owner@simple-subs.com" };
      return assert.eventually.isTrue(wrapped(data));
    });

    it("should return false when accountType is USER", function() {
      let data = { email: "user@simple-subs.com" };
      return assert.eventually.isFalse(wrapped(data));
    });

    it("should return false when user is invalid", function() {
      let data = { email: "idontexist@simple-subs.com" };
      return assert.eventually.isFalse(wrapped(data));
    });
  });

  describe("deleteUsers", function() {
    const getExpectedDeleteResult = (users, uidsToDelete, adminAccountType) => {
      const canDelete = (accountType) => (
        Permissions[adminAccountType][Actions.DELETING] >= AccountTypesPriority[accountType]
      );
      return Object.keys(users).filter((uid) => !(
        uidsToDelete.includes(uid) &&
        canDelete(users[uid].accountType)
      ));
    };

    const getActualDeleteResult = async (domain) => {
      let result = await userDataCollection(domain).get();
      let sampleUidsArr = Object.values(sampleUids);
      return result.docs
        .filter((doc) => !sampleUidsArr.includes(doc.id))
        .map((doc) => doc.id);
    };

    const wrapped = test.wrap(myFunctions.deleteUsers);

    describe("auth tests", function() {
      let uneditableUsers;

      before(async function() {
        uneditableUsers = await generateUserData(invalidTestDomain, 1);
      });

      after(function() {
        return cleanUpUsers(invalidTestDomain);
      });

      it("should throw an error if user is not an admin", function() {
        let data = {};
        let context = { auth: { uid: sampleUids.user } };
        return assert.isRejected(wrapped(data, context), "User is not an admin");
      });
      it("should throw error if UIDs are in different domain", function() {
        let data = { uids: Object.keys(uneditableUsers) };
        let context = { auth: { uid: sampleUids.admin } };
        return assert.isRejected(wrapped(data, context), "Cannot edit users outside of domain");
      });
    });

    describe("controlled tests", function() {
      const exampleUserData = [
        { accountType: "OWNER" },
        { accountType: "USER" },
        { accountType: "ADMIN" },
        { accountType: "USER" },
        { accountType: "USER" },
        { accountType: "ADMIN" },
        { accountType: "OWNER" },
        { accountType: "USER" },
        { accountType: "ADMIN" },
        { accountType: "USER" },
        { accountType: "USER" },
        { accountType: "ADMIN" }
      ];

      const indexesToDelete = [0, 3, 4, 5];
      let exampleUsers;
      let uidsToDelete;
      let data;

      before(async function() {
        exampleUsers = await makeTestUsers(testDomain, exampleUserData);
        uidsToDelete = Object.keys(exampleUsers).filter((user, index) => indexesToDelete.includes(index));
        data = { uids: uidsToDelete };
      });

      after(function() {
        return cleanUpUsers(testDomain);
      });

      it("should delete all requested users with USER account type within domain when admin", function() {
        let context = { auth: { uid: sampleUids.admin } };
        return wrapped(data, context).then(() => getActualDeleteResult(testDomain).then((result) => {
          let expected = uidsToDelete.filter((uid) => exampleUsers[uid].accountType === "USER");
          assert.notIncludeMembers(result, expected);
          assert.includeMembers(result, getExpectedDeleteResult(exampleUsers, expected, "ADMIN"));
        }));
      });

      it("should delete all requested users with USER/ADMIN account type within domain when owner", function() {
        let context = { auth: { uid: sampleUids.owner } };
        return wrapped(data, context).then(() => getActualDeleteResult(testDomain).then((result) => {
          let expected = uidsToDelete.filter((uid) => exampleUsers[uid].accountType !== "OWNER");
          assert.notIncludeMembers(result, expected);
          assert.includeMembers(result, getExpectedDeleteResult(exampleUsers, expected, "OWNER"));
        }));
      });
    });
  });

  describe("listAllUsers", function() {
    const wrapped = test.wrap(myFunctions.listAllUsers);
    let usersWithinDomain;
    let usersOutsideDomain;

    before(async function() {
      usersWithinDomain = await generateUserData(testDomain, 6);
      usersOutsideDomain = await generateUserData(invalidTestDomain, 6);
    });

    after(function() {
      return Promise.all([
        cleanUpUsers(testDomain),
        cleanUpUsers(invalidTestDomain)
      ])
    });

    it("should throw an error if user is not an admin", function() {
      let data = {};
      let context = { auth: { uid: sampleUids.user } };
      return assert.isRejected(wrapped(data, context), "User is not an admin");
    });

    it("should only display users in own domain", function() {
      let data = {}
      let context = { auth: { uid: sampleUids.admin } };
      return wrapped(data, context).then((listedUsers) => {
        let uidsWithinDomain = Object.keys(usersWithinDomain);
        let uidsOutsideDomain = Object.keys(usersOutsideDomain);
        let listedUids = Object.keys(listedUsers);
        assert.includeMembers(listedUids, uidsWithinDomain);
        assert.notIncludeMembers(listedUids, uidsOutsideDomain);
      });
    });
  });

  describe("setEmail", function() {
    const wrapped = test.wrap(myFunctions.setEmail);
    const userData = [
      { accountType: "OWNER" },
      { accountType: "ADMIN" },
      { accountType: "USER" },
      { accountType: "USER" },
      { accountType: "USER" },
      { accountType: "USER" },
      { accountType: "USER" },
      { accountType: "USER" }
    ];
    let ownerUser;
    let adminUser;
    let users;

    before(async function() {
      ownerUser = await makeTestUsers(testDomain, [userData[0]]);
      adminUser = await makeTestUsers(testDomain, [userData[1]]);
      users = await makeTestUsers(testDomain, userData.slice(2));
    });

    after(function() {
      return cleanUpUsers(testDomain);
    });

    it("should throw an error if user is not an admin", function() {
      let data = {};
      let context = { auth: { uid: sampleUids.user } };
      return assert.isRejected(wrapped(data, context), "User is not an admin");
    });

    it("should throw an error if user is admin trying to edit other admins", function() {
      let newEmail = "newemail0@simple-subs.com";
      let uidToChange = Object.keys(adminUser)[0];
      let data = { uid: uidToChange, email: newEmail};
      let context = { auth: { uid: sampleUids.admin } };
      return assert.isRejected(wrapped(data, context), "You do not have permission to edit this user");
    });

    it("should throw an error if user is admin trying to edit other owners", function() {
      let newEmail = "newemail1@simple-subs.com";
      let uidToChange = Object.keys(ownerUser)[0];
      let data = { uid: uidToChange, email: newEmail };
      let context = { auth: { uid: sampleUids.admin } };
      return assert.isRejected(wrapped(data, context), "You do not have permission to edit this user");
    });

    it("should throw an error if user is owner trying to edit other owners", function() {
      let newEmail = "newemail2@simple-subs.com";
      let uidToChange = Object.keys(ownerUser)[0];
      let data = { uid: uidToChange, email: newEmail };
      let context = { auth: { uid: sampleUids.owner } };
      return assert.isRejected(wrapped(data, context), "You do not have permission to edit this user");
    });

    it("should only set email of specified user", function() {
      let newEmail = "newemail3@simple-subs.com";
      let uidToChange = Object.keys(users)[0];
      let data = { uid: uidToChange, email: newEmail };
      let context = { auth: { uid: sampleUids.admin } };
      return assert.becomes(
        wrapped(data, context).then(async () => (await admin.auth().getUser(uidToChange)).email),
        newEmail
      );
    });

    it("should work as expected if user is admin editing themself", function() {
      let newEmail = "newemail4@simple-subs.com";
      let uidToChange = Object.keys(adminUser)[0];
      let data = { uid: uidToChange, email: newEmail };
      let context = { auth: { uid: uidToChange } };
      return assert.becomes(
        wrapped(data, context).then(async () => (await admin.auth().getUser(uidToChange)).email),
        newEmail
      );
    });

    it("should work as expected if user is owner editing themself", function() {
      let newEmail = "newemail5@simple-subs.com";
      let uidToChange = Object.keys(ownerUser)[0];
      let data = { uid: uidToChange, email: newEmail };
      let context = { auth: { uid: uidToChange } };
      return assert.becomes(
        wrapped(data, context).then(async () => (await admin.auth().getUser(uidToChange)).email),
        newEmail
      );
    });
  });

  // NOTE: Since we cannot actually access a user's password, these tests rely on the success/failure reports from
  // the function rather than directly checking the results in Firebase.
  describe("resetPasswords", function() {
    const wrapped = test.wrap(myFunctions.resetPasswords);
    const userData = [
      { accountType: "OWNER" },
      { accountType: "OWNER" },
      { accountType: "OWNER" },
      { accountType: "OWNER" },
      { accountType: "ADMIN" },
      { accountType: "ADMIN" },
      { accountType: "ADMIN" },
      { accountType: "ADMIN" },
      { accountType: "USER" },
      { accountType: "USER" },
      { accountType: "USER" },
      { accountType: "USER" }
    ];
    let owners;
    let admins;
    let users;

    before(async function() {
      owners = Object.keys(await makeTestUsers(testDomain, userData.slice(0, 4)));
      admins = Object.keys(await makeTestUsers(testDomain, userData.slice(4, 8)));
      users = Object.keys(await makeTestUsers(testDomain, userData.slice(8)));
    });

    after(function() {
      return cleanUpUsers(testDomain);
    });

    it("should throw an error if user is not an admin", function() {
      let data = {};
      let context = { auth: { uid: sampleUids.user } };
      return assert.isRejected(wrapped(data, context), "User is not an admin");
    });

    it("should only edit users with accountType USER if user is an admin", function() {
      let uidsToReset = [owners[0], admins[0], users[0]];
      let data = { uids: uidsToReset };
      let context = { auth: { uid: sampleUids.admin } };
      let expected = {
        success: [uidsToReset[2]],
        failed: uidsToReset.slice(0, 2)
      };
      // should return { success: [uids], failed: [uids] }
      return wrapped(data, context).then(({ success, failed }) => {
        assert.sameMembers(success, expected.success);
        assert.sameMembers(failed, expected.failed);
      });
    });

    it("should only edit users with accountTypes USER or ADMIN if user is an owner", function() {
      let uidsToReset = [owners[0], admins[0], users[0]];
      let data = { uids: uidsToReset };
      let context = { auth: { uid: sampleUids.owner } };
      let expected = {
        success: uidsToReset.slice(1),
        failed: [uidsToReset[0]]
      };
      // should return { success: [uids], failed: [uids] }
      return wrapped(data, context).then(({ success, failed }) => {
        assert.sameMembers(success, expected.success);
        assert.sameMembers(failed, expected.failed);
      });
    });

    it("should work if admin is resetting their own password", function() {
      let uidsToReset = [admins[2]];
      let data = { uids: uidsToReset };
      let context = { auth: { uid: uidsToReset[0] } };
      let expected = {
        success: uidsToReset,
        failed: []
      };
      // should return { success: [uids], failed: [uids] }
      return wrapped(data, context).then(({ success, failed }) => {
        assert.sameMembers(success, expected.success);
        assert.sameMembers(failed, expected.failed);
      });
    });

    it("should work if owner is resetting their own password", function() {
      let uidsToReset = [owners[2]];
      let data = { uids: uidsToReset };
      let context = { auth: { uid: uidsToReset[0] } };
      let expected = {
        success: uidsToReset,
        failed: []
      };
      // should return { password: [password], success: [uids], failed: [uids] }
      return wrapped(data, context).then(({ success, failed }) => {
        assert.sameMembers(success, expected.success);
        assert.sameMembers(failed, expected.failed);
      });
    });
  });

  describe("deleteFailedUser", function() {
    const createFailedUser = async () => {
      let userRecord = await admin.auth().createUser({ email: `${generateRandomString(6)}@simple-subs.com` });
      return userRecord.uid;
    }
    const wrapped = test.wrap(myFunctions.deleteFailedUser);

    let successUids;
    let failedUids;

    before(async function() {
      failedUids = [await createFailedUser(), await createFailedUser()];
      successUids = Object.keys(await generateUserData(testDomain, 4));
    });

    after(function() {
      return cleanUpUsers(testDomain);
    });

    it("should throw an error if user is not logged into failed account", function() {
      let data = { uid: failedUids[0] };
      let context = { auth: { uid: sampleUids.user } };
      return assert.isRejected(wrapped(data, context), "You must be logged into the account to delete it.");
    });

    it("should throw an error if account is successfully created", function() {
      let user = successUids[0];
      let data = { uid: user };
      let context = { auth: { uid: user } };
      return assert.isRejected(wrapped(data, context), "You cannot delete a successfully created account.");
    });

    it("should succeed if user is deleting their own failed account", function() {
      let user = failedUids[1];
      let data = { uid: user };
      let context = { auth: { uid: user } };
      return wrapped(data, context).then(() => assert.isRejected(
        admin.auth().getUser(user),
        "There is no user record corresponding to the provided identifier."
      ));
    });
  });

  describe("importUsers", function() {
    const EXISTING_USER_DATA = [
      { email: "owner1@simple-subs.com", name: "Bob", accountType: "OWNER" },
      { email: "admin1@simple-subs.com", name: "Joe", accountType: "ADMIN" },
      { email: "admin2@simple-subs.com", name: "Dave", accountType: "ADMIN" },
      { email: "user1@simple-subs.com", name: "Dan", accountType: "USER" },
      { email: "user2@simple-subs.com", name: "Fred", accountType: "USER" }
    ];

    const IMPORT_DATA = {
      "owner1@simple-subs.com": { name: "Bobby", accountType: "ADMIN" },
      "admin1@simple-subs.com": { name: "Joey", accountType: "OWNER" },
      "admin2@simple-subs.com": { name: "Davey", accountType: "USER" },
      "user1@simple-subs.com": { name: "Danny", accountType: "ADMIN" },
      "user2@simple-subs.com": { name: "Freddy", accountType: "OWNER" },
      "newowner@simple-subs.com": { name: "Emma", accountType: "OWNER" },
      "newadmin@simple-subs.com": { name: "Emily", accountType: "ADMIN" },
      "newuser@simple-subs.com": { name: "Emmaline", accountType: "USER" }
    };

    const wrapped = test.wrap(myFunctions.importUsers);
    let createdUsers;
    let updatedUsers;
    let actualResult;

    const prepareTest = async (accountType) => {
      await makeTestUsers(testDomain, EXISTING_USER_DATA);
      let data = { userData: IMPORT_DATA };
      let context = { auth: { uid: sampleUids[accountType] } };

      let { updated, created } = await wrapped(data, context);
      createdUsers = created;
      updatedUsers = updated;

      let emailsToUids = { ...updated, ...created };

      let querySnapshot = await userDataCollection(testDomain).get();
      let rawResult = collectionToObject(querySnapshot);
      actualResult = {};
      for (let email of Object.keys(emailsToUids)) {
        actualResult[email] = rawResult[emailsToUids[email]];
      }
    };

    describe("permission tests", function() {
      before(async function() {
        let invalidData = [{ email: "invalid@simple-subs.com", accountType: "USER" }];
        let ownerData = [{ email: "testowner@simple-subs.com", accountType: "OWNER" }];
        await makeTestUsers(invalidTestDomain, invalidData);
        await makeTestUsers(testDomain, ownerData);
      });

      after(async function() {
        await cleanUpUsers(invalidTestDomain);
        await cleanUpUsers(testDomain);
      });

      it("should throw an error if user is not an admin", function() {
        let data = {};
        let context = { auth: { uid: sampleUids.user } };
        return assert.isRejected(wrapped(data, context), "User is not an admin");
      });

      it("should throw an error if editing user outside of domain", function() {
        let data = {
          userData: {
            "invalid@simple-subs.com": {
              accountType: "ADMIN"
            }
          }
        };
        let context = { auth: { uid: sampleUids.admin } };
        return assert.isRejected(wrapped(data, context), "Cannot edit users outside of domain");
      });

      it("should not edit accountType of user's own account", function() {
        let data = {
          userData: {
            "owner@simple-subs.com": {
              accountType: "USER"
            }
          }
        };
        let context = { auth: { uid: sampleUids.owner } };
        return wrapped(data, context).then(async () => {
          let ownerDoc = await userDataDoc(testDomain, sampleUids.owner).get();
          assert.equal(ownerDoc.data().accountType, "OWNER");
        });
      });
    });

    describe("data validation tests", function() {
      before(async function() {
        await makeTestUsers(testDomain, EXISTING_USER_DATA);
      })
    });

    describe("when user is admin", function() {
      const expectedCreatedResult = {
        "newowner@simple-subs.com": { name: "Emma", accountType: "ADMIN" },
        "newadmin@simple-subs.com": { name: "Emily", accountType: "ADMIN" },
        "newuser@simple-subs.com": { name: "Emmaline", accountType: "USER" }
      };

      const expectedUpdatedResult = {
        "user1@simple-subs.com": { name: "Danny", accountType: "ADMIN" },
        "user2@simple-subs.com": { name: "Freddy", accountType: "ADMIN" }
      };

      before(function() {
        return prepareTest("admin");
      });

      after(function() {
        return cleanUpUsers(testDomain);
      });

      it("should create users with maximum admin accounts", function() {
        assert.isTrue(allAreSubset(actualResult, expectedCreatedResult));
        assert.eventually.isTrue(checkDomains(testDomain, Object.keys(expectedCreatedResult)));
      });

      it("should update all USER data while only changing USER -> ADMIN accountType", function() {
        assert.isTrue(allAreSubset(actualResult, expectedUpdatedResult));
      });

      it("should match expected result with reported result", function() {
        assert.sameMembers(Object.keys(createdUsers), Object.keys(expectedCreatedResult));
        assert.sameMembers(Object.keys(updatedUsers), Object.keys(expectedUpdatedResult));
      });
    });

    describe("when user is owner", function() {
      const expectedCreatedResult = {
        "newowner@simple-subs.com": { name: "Emma", accountType: "OWNER" },
        "newadmin@simple-subs.com": { name: "Emily",  accountType: "ADMIN" },
        "newuser@simple-subs.com": { name: "Emmaline", accountType: "USER" }
      };

      const expectedUpdatedResult = {
        "admin1@simple-subs.com": { name: "Joey", accountType: "OWNER" },
        "admin2@simple-subs.com": { name: "Davey", accountType: "USER" },
        "user1@simple-subs.com": { name: "Danny", accountType: "ADMIN" },
        "user2@simple-subs.com": { name: "Freddy", accountType: "OWNER" }
      };

      before(function() {
        return prepareTest("owner");
      });

      after(function() {
        return cleanUpUsers(testDomain);
      });

      it("should create users with all types of accounts", function() {
        assert.isTrue(allAreSubset(actualResult, expectedCreatedResult));
        assert.eventually.isTrue(checkDomains(testDomain, Object.keys(expectedCreatedResult)));
      });

      it("should update all user data while changing all accountTypes", function() {
        assert.isTrue(allAreSubset(actualResult, expectedUpdatedResult));
      });

      it("should match expected result with reported result", function() {
        assert.sameMembers(Object.keys(createdUsers), Object.keys(expectedCreatedResult));
        assert.sameMembers(Object.keys(updatedUsers), Object.keys(expectedUpdatedResult));
      });
    });

    // using owner permissions
    describe("when defaultUser is populated", function() {
      const populatedDefaultUser = { grade: "9" };

      const expectedCreatedResult = {
        "newowner@simple-subs.com": { ...populatedDefaultUser, name: "Emma", accountType: "OWNER" },
        "newadmin@simple-subs.com": { ...populatedDefaultUser, name: "Emily",  accountType: "ADMIN" },
        "newuser@simple-subs.com": { ...populatedDefaultUser, name: "Emmaline", accountType: "USER" }
      };

      const expectedUpdatedResult = {
        "admin1@simple-subs.com": { name: "Joey", accountType: "OWNER" },
        "admin2@simple-subs.com": { name: "Davey", accountType: "USER" },
        "user1@simple-subs.com": { name: "Danny", accountType: "ADMIN" },
        "user2@simple-subs.com": { name: "Freddy", accountType: "OWNER" }
      };

      const setDefaultUser = (data = {}) => (
        firestore
          .collection("domains")
          .doc(testDomain)
          .collection("appData")
          .doc("defaultUser")
          .set({ ...defaultUserData, ...data })
      );

      before(async function() {
        await setDefaultUser(populatedDefaultUser);
        await prepareTest("owner");
      });

      after(async function() {
        await setDefaultUser();
        await cleanUpUsers(testDomain);
      });

      it("should populate created users with default user fields", function() {
        assert.isTrue(allAreSubset(actualResult, expectedCreatedResult));
      });

      it("should not populate existing users", function() {
        assert.isTrue(allAreSubset(actualResult, expectedUpdatedResult));
      });
    })
  });
});