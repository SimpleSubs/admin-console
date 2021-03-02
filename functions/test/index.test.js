const { v4: uuid } = require('uuid');

const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const { assert } = chai;

const admin = require("firebase-admin");
const { batchWrite } = require("../helpers");

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

const testDomain = "test";
const invalidTestDomain = "cantTouchThis";

const userDataCollection = (domain, uid) => (
  admin.firestore()
    .collection("domains")
    .doc(domain)
    .collection("userData")
    .doc(uid)
);

const generateRandomString = (length) => Math.random().toString(20).substr(2, length);
const generateRandomInteger = (lowerBound, upperBound) => (
  Math.floor(Math.random() * (upperBound - lowerBound)) + lowerBound
);

const arrsToObject = (keys, values) => {
  let obj = {};
  for (let i = 0; i < keys.length; i++) {
    obj[keys[i]] = values[i];
  }
  return obj;
};

const makeTestUsers = async (domain, users) => {
  let usersWithUids = users.map((user) => ({ ...user, uid: uuid() }));
  await admin.auth().importUsers(
    usersWithUids.map(({ email, uid }) => email
      ? { email, uid }
      : { email: `${generateRandomString(6)}@simple-subs.com`, uid }
    )
  );
  const writeUserData = (batch, data) => {
    let dataToPush = { ...data };
    delete dataToPush.email;
    delete dataToPush.uid;
    batch.set(userDataCollection(domain, data.uid), dataToPush);
  };
  const writeDomainData = (batch, data) => {
    batch.set(admin.firestore().collection("userDomains").doc(data.uid), { domain });
  }
  await batchWrite(usersWithUids, writeUserData, admin.firestore(), console.error);
  await batchWrite(usersWithUids, writeDomainData, admin.firestore(), console.error);
  return arrsToObject(usersWithUids.map(({ uid }) => uid), users);
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

const createFailedUser = async () => {
  let userRecord = await admin.auth().createUser({ email: `${generateRandomString(6)}@simple-subs.com` });
  return userRecord.uid;
}

// Assuming no more than 1000 users
const cleanUpUsers = async (domain) => {
  let allUids = (await admin.auth().listUsers()).users.map(({ uid }) => uid);
  let uidsToDelete = allUids.filter((uid) => !Object.values(sampleUids).includes(uid));
  await admin.auth().deleteUsers(uidsToDelete);
  const deleteAction = (batch, ref) => batch.delete(ref);
  await batchWrite(
    uidsToDelete.map((uid) => userDataCollection(domain, uid)),
    deleteAction,
    admin.firestore(),
    console.error
  );
  await batchWrite(uidsToDelete.map((uid) => (
    admin.firestore()
      .collection("userDomains")
      .doc(uid)
  )), deleteAction, admin.firestore(), console.error);
};

const getExpectedDeleteResult = (users, uidsToDelete, adminAccountType) => {
  const canDelete = (accountType) => {
    switch (adminAccountType) {
      case "ADMIN":
        return accountType === "USER";
      case "OWNER":
        return accountType !== "OWNER";
      default:
        return false;
    }
  };
  return Object.keys(users).filter((uid) => !(
    uidsToDelete.includes(uid) &&
    canDelete(users[uid].accountType)
  ));
};

const getActualDeleteResult = async (domain) => {
  let result = await admin.firestore().collection("domains").doc(domain).collection("userData").get();
  let sampleUidsArr = Object.values(sampleUids);
  return result.docs
    .filter((doc) => !sampleUidsArr.includes(doc.id))
    .map((doc) => doc.id);
};

describe("Firebase functions", function() {
  this.timeout(5000);

  afterEach(function() {
    test.cleanup();
  });

  describe("checkIsAdmin", async function() {
    let wrapped;

    before(function() {
      let { checkIsAdmin } = require("../index.js");
      wrapped = test.wrap(checkIsAdmin);
    })

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
    let wrapped;

    describe("auth tests", function() {
      let uneditableUsers;

      before(async function() {
        let { deleteUsers } = require("../index.js");
        wrapped = test.wrap(deleteUsers);
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

    // describe("stress tests", function() {
    //   let exampleUsers = generateUserData(testDomain, 900);
    //   it("should be able to handle over 500 deletes at a time", function() {
    //     let exampleUids = Object.keys(exampleUsers);
    //     let indexesToDelete = generateUniqueRandomIntegers(0, exampleUids.length, 800);
    //     let uidsToDelete = exampleUids.filter((user, index) => indexesToDelete.includes(index));
    //     let data = { uids: uidsToDelete };
    //     let context = { auth: { uid: sampleUids.admin } };
    //     return assert.eventually.isTrue(
    //       wrapped(data, context)
    //         .then(() => deleteExpectedMatchesResult(exampleUsers, uidsToDelete, testDomain))
    //     );
    //   });
    // });
  });

  describe("listAllUsers", function() {
    let wrapped;
    let usersWithinDomain;
    let usersOutsideDomain;

    before(async function() {
      let { listAllUsers } = require("../index.js");
      wrapped = test.wrap(listAllUsers);
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
    let wrapped;
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
      let { setEmail } = require("../index.js");
      wrapped = test.wrap(setEmail);
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
    let wrapped;
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
      let { resetPasswords } = require("../index.js");
      wrapped = test.wrap(resetPasswords);
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
    let wrapped;
    let successUids;
    let failedUids;

    before(async function() {
      let { deleteFailedUser } = require("../index.js");
      wrapped = test.wrap(deleteFailedUser);
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
});