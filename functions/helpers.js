exports.batchWrite = async (refs, action, firestore, httpsError = console.error) => {
  const maxWrites = 400; // write batch only allows maximum 500 writes per batch
  let batch = firestore.batch();
  let i = 0;
  let rounds = 0;
  try {
    for (const ref of refs) {
      action(batch, ref);
      i++
      if (i >= maxWrites) {
        i = 0;
        rounds++;
        console.log("Intermediate committing of batch operation");
        await batch.commit();
        batch = firestore.batch();
      }
    }
    if (i > 0) {
      console.log("Firebase batch operation completed. Doing final committing of batch operation.");
      await batch.commit();
    } else {
      console.log("Firebase batch operation completed.");
    }
  } catch (e) {
    console.log("Number of operations: " + (i + rounds * maxWrites));
    throw httpsError(e);
  }
}

exports.arrsToObject = (keys, values) => {
  let obj = {};
  for (let i = 0; i < keys.length; i++) {
    obj[keys[i]] = values[i];
  }
  return obj;
};

exports.collectionToObject = (querySnapshot) => {
  let collectionObj = {};
  querySnapshot.forEach((doc) => collectionObj[doc.id] = doc.data());
  return collectionObj;
};

const AccountTypes = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  USER: "USER"
};

const Actions = {
  CREATING: "CREATING",
  EDITING: "EDITING",
  DELETING: "DELETING"
};

const AccountTypesPriority = {
  USER: 1,
  ADMIN: 2,
  OWNER: 3
};

const Permissions = {
  [AccountTypes.USER]: {
    [Actions.CREATING]: 0,
    [Actions.EDITING]: 0,
    [Actions.DELETING]: 0
  },
  [AccountTypes.ADMIN]: {
    [Actions.CREATING]: AccountTypesPriority.ADMIN,
    [Actions.EDITING]: AccountTypesPriority.USER,
    [Actions.DELETING]: AccountTypesPriority.USER
  },
  [AccountTypes.OWNER]: {
    [Actions.CREATING]: AccountTypesPriority.OWNER,
    [Actions.EDITING]: AccountTypesPriority.ADMIN,
    [Actions.DELETING]: AccountTypesPriority.ADMIN
  }
};

exports.AccountTypes = AccountTypes;
exports.AccountTypesPriority = AccountTypesPriority;
exports.Actions = Actions;
exports.Permissions = Permissions;