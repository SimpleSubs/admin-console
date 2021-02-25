exports.batchWrite = async (refs, action, firestore, throwError) => {
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
    throwError(e);
  }
}