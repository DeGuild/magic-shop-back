// The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
const functions = require("firebase-functions");

// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
admin.initializeApp();

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

exports.addMagicScroll = functions.https.onRequest(async (req, res) => {
  // Grab the text parameter.
  const address = req.body.address;
  const tokenId = req.body.tokenId;
  const courseId = req.body.courseId;
  const description = req.body.description;
  const url = req.body.url
    ? req.body.url
    : "https://firebasestorage.googleapis.com/v0/b/deguild-2021.appspot.com/o/0.png?alt=media&token=131e4102-2ca3-4bf0-9480-3038c45aa372";
  // Push the new message into Firestore using the Firebase Admin SDK.
  await admin
    .firestore()
    .collection("MagicShop/")
    .doc(address)
    .set({ address });
  await admin
    .firestore()
    .collection(`MagicShop/${address}/tokens`)
    .doc(tokenId)
    .set({ url, tokenId, courseId, description });

  // Send back a message that we've successfully written the message
  res.json({
    result: "Successful",
  });
});

exports.readMagicScroll = functions.https.onRequest(async (req, res) => {
  // Grab the text parameter.
  const paths = req.path.split("/");
  const address = paths[1];
  const tokenId = paths[2];
  const readResult = await admin
    .firestore()
    .collection(`MagicShop/${address}/tokens`)
    .doc(tokenId)
    .get();
  // Send back a message that we've successfully written the message
  functions.logger.log(readResult);

  try {
    res.json({
      imageUrl: `${readResult.data().url}`,
      tokenId: `${readResult.data().tokenId}`,
    });
  } catch (error) {
    res.json({
      message: "Magic scroll not found!",
    });
  }
});

exports.deleteMagicScroll = functions.https.onRequest(async (req, res) => {
  // Grab the text parameter.
  const address = req.body.address;
  const tokenId = req.body.tokenId;
  // Push the new message into Firestore using the Firebase Admin SDK.
  await admin
    .firestore()
    .collection(`MagicShop/${address}/tokens`)
    .doc(tokenId)
    .delete();

  // Send back a message that we've successfully written the message
  res.json({
    result: "Successful",
  });
});

exports.deleteMagicShop = functions.https.onRequest(async (req, res) => {
  // Grab the text parameter.
  const address = req.body.address;
  // Push the new message into Firestore using the Firebase Admin SDK.
  await admin.firestore().collection("MagicShop/").doc(address).delete();

  // Send back a message that we've successfully written the message
  res.json({
    result: "Successful",
  });
});

exports.allMagicShops = functions.https.onRequest(async (req, res) => {
  // Grab the text parameter.
  const lastItem = req.path;
  const paths = req.path.split("/");
  const address = paths[1];
  const direction = paths[2];

  let data = [];
  if (lastItem.length > 1) {
    const paths = lastItem.split("/");
    if (direction === "next") {
      const startAtSnapshot = admin
        .firestore()
        .collection("MagicShop/")
        .orderBy("address", "asc")
        .startAfter(address);

      const items = await startAtSnapshot.limit(8).get();
      items.forEach((doc) => {
        data.push(doc.id);
      });
    } else if (paths[2] === "previous") {
      const startAtSnapshot = admin
        .firestore()
        .collection("MagicShop/")
        .orderBy("address", "desc")
        .startAfter(address);

      const items = await startAtSnapshot.limit(8).get();
      items.forEach((doc) => {
        data.push(doc.id);
      });
    }
  } else {
    const readResult = await admin
      .firestore()
      .collection("MagicShop/")
      .orderBy("address", "asc")
      .limit(8)
      .get();
    // Send back a message that we've successfully written the message3
    readResult.forEach((doc) => {
      data.push(doc.id);
    });
    // readResult.map
    functions.logger.log(readResult);
  }

  res.json({
    result: data.sort(),
  });
});
