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
  const url = req.body.url
    ? req.body.url
    : "https://firebasestorage.googleapis.com/v0/b/deguild-2021.appspot.com/o/0.png?alt=media&token=131e4102-2ca3-4bf0-9480-3038c45aa372";
  // Push the new message into Firestore using the Firebase Admin SDK.
  await admin
    .firestore()
    .collection(`shop/${address}/tokens`)
    .doc(tokenId)
    .set({ url });
  await admin
    .firestore()
    .collection("deGuild/shops/addresses/")
    .doc(`${address}`)
    .set({ address });

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
    .collection(`shop/${address}/tokens`)
    .doc(tokenId)
    .get();
  // Send back a message that we've successfully written the message
  functions.logger.log(readResult);

  try {
    res.json({
      imageUrl: `${readResult.data().url}`,
    });
  } catch (error) {
    res.json({
      message: "Magic scroll not found!",
    });
  }
});
