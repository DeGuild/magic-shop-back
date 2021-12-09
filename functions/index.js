"use strict";

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const express = require("express");
const cors = require("cors")({ origin: true });
const shop = express();

const ownableABI = require("./contracts/Ownable.json").abi;
const MagicScrollsPlusABI =
  require("./contracts/MagicShop/V2/IMagicScrolls+.sol/IMagicScrollsPlus.json").abi;

const Web3Token = require("web3-token");
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const { parse } = require("json2csv");

/**
 * @dev function to check the token attached from the request, rejecting any request with no Web3 token attached
 */
const validateWeb3Token = async (req, res, next) => {
  if (!req.headers.authorization) {
    functions.logger.error(
      "No web token was passed in the Authorization header."
    );
    res.status(403).send("Unauthorized");
    return;
  }

  const token = req.headers.authorization;

  try {
    const { address, body } = await Web3Token.verify(token);
    if (address) {
      next();
      return;
    }
  } catch (error) {
    functions.logger.error("Error while verifying Firebase ID token:", error);
  }
  res.status(403).send("Unauthorized");
  return;
};

/**
 * @dev function to help deleting collection in Firestore. It is a helper function.
 */
async function deleteQueryBatch(db, query, resolve) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    // When there are no documents left, we are done
    resolve();
    return;
  }

  // Delete documents in a batch
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Recurse on the next process tick, to avoid
  // exploding the stack.
  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

/**
 * @dev function to delete collection in Firestore. It is a helper function.
 */
async function deleteCollection(db, collectionPath, batchSize) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy("__name__").limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

/**
 * @dev function to add Magic Scroll to the database, but can only proceed if the sender is the owner
 */
const addMagicScroll = async (req, res) => {
  // Grab the text parameter.
  const addressShop = req.body.address;
  const tokenId = parseInt(req.body.tokenId, 10);
  const courseId = req.body.courseId;
  const description = req.body.description;
  const name = req.body.name;
  const url = req.body.url
    ? req.body.url
    : "https://firebasestorage.googleapis.com/v0/b/deguild-2021.appspot.com/o/0.png?alt=media&token=131e4102-2ca3-4bf0-9480-3038c45aa372";

  const prerequisite = req.body.prerequisite
    ? req.body.prerequisite
    : "0x0000000000000000000000000000000000000000";
  const web3 = createAlchemyWeb3(functions.config().web3.api);

  const token = req.headers.authorization;
  const { address, body } = await Web3Token.verify(token);
  const userAddress = web3.utils.toChecksumAddress(address);

  const ownable = new web3.eth.Contract(ownableABI, addressShop);
  const ownerOfShop = await ownable.methods.owner().call();
  functions.logger.log(userAddress, ownerOfShop);

  if (userAddress !== ownerOfShop) {
    res.status(403).send("Unauthorized");
    return;
  }
  await admin
    .firestore()
    .collection(`MagicShop/${addressShop}/tokens`)
    .doc(req.body.tokenId)
    .set({
      url,
      tokenId,
      courseId,
      description,
      name,
      prerequisite,
    });

  // Send back a message that we've successfully written the message
  res.json({
    result: "Successful",
  });
};

/**
 * @dev function to add Examination round to the database, but can only proceed if the sender is the owner
 */
const addRound = async (req, res) => {
  // Grab the text parameter.

  const addressShop = req.body.addressM;
  const addressCertificate = req.body.addressC;
  const certificateToken = req.body.tokenId;
  const coursePassword = req.body.coursePassword;
  const web3 = createAlchemyWeb3(functions.config().web3.api);

  const token = req.headers.authorization;
  const { address, body } = await Web3Token.verify(token);
  const userAddress = web3.utils.toChecksumAddress(address);

  const ownable = new web3.eth.Contract(ownableABI, addressShop);
  const ownerOfShop = await ownable.methods.owner().call();

  if (userAddress !== ownerOfShop) {
    res.status(403).send("Unauthorized");
    return;
  }

  await admin
    .firestore()
    .collection(`MagicShop/${addressShop}/rounds/${addressCertificate}/tokens/${certificateToken}/passwords`)
    .doc(coursePassword)
    .set({
      addressCertificate,
      certificateToken,
      coursePassword,
    });

  // Send back a message that we've successfully written the message
  res.json({
    result: "Successful",
  });
};

/**
 * @dev function to get Examination rounds from the database, but can only proceed if the sender is the owner
 */
const getRound = async (req, res) => {
  // Grab the text parameter.
  const addressShop = req.params.addressM;
  const addressCertificate = req.params.addressC;
  const certificateToken = req.params.tokenId;
  const web3 = createAlchemyWeb3(functions.config().web3.api);

  const token = req.headers.authorization;
  const { address, body } = await Web3Token.verify(token);
  const userAddress = web3.utils.toChecksumAddress(address);
  functions.logger.log(addressShop, addressCertificate, certificateToken);

  const ownable = new web3.eth.Contract(ownableABI, addressShop);
  const ownerOfShop = await ownable.methods.owner().call();

  if (userAddress !== ownerOfShop) {
    res.status(403).send("Unauthorized");
    return;
  }

  //getting passwords
  const readResult2 = await admin
    .firestore()
    .collection(`MagicShop/${addressShop}/rounds/${addressCertificate}/tokens/${certificateToken}/passwords`)
    .where("addressCertificate", "==", addressCertificate)
    .where("certificateToken", "==", parseInt(certificateToken, 10))
    .get();
  if (!readResult2) {
    res
      .status(404)
      .json({ message: `There is no round for ${addressCertificate}}` });
    return;
  }

  //extract data out of the read result from Firestore
  const data2 = [];
  readResult2.forEach((doc) => {
    data2.push(doc.data());
  });
  functions.logger.log(data2);

  res.json(data2);
};

/**
 * @dev function to get examinees from the database in the form of CSV, but can only proceed if the sender is the owner
 */
const getMagicScrollsCsv = async (req, res) => {
  // Grab the text parameter.

  const addressShop = req.params.addressM;
  const scrollType = req.params.tokenType;
  const password = req.params.password;
  const web3 = createAlchemyWeb3(functions.config().web3.api);

  const token = req.headers.authorization;
  const { address, body } = await Web3Token.verify(token);
  const userAddress = web3.utils.toChecksumAddress(address);
  const hashed = web3.utils.keccak256(password);

  const ownable = new web3.eth.Contract(ownableABI, addressShop);
  const ownerOfShop = await ownable.methods.owner().call();
  const magicShop = new web3.eth.Contract(MagicScrollsPlusABI, addressShop);

  if (userAddress !== ownerOfShop) {
    res.status(403).send("Unauthorized");
    return;
  }

  const consumed = await magicShop.getPastEvents("ScrollConsumed", {
    filter: { passcode: hashed },
    fromBlock: 0,
    toBlock: "latest",
  });
  functions.logger.log(consumed);

  const jsonForCsv = await Promise.all(
    consumed.map(async (event) => {
      let owner;
      let info;
      try {
        owner = await magicShop.methods
          .ownerOf(event.returnValues.scrollId)
          .call();
        info = await magicShop.methods
          .scrollInfo(event.returnValues.scrollId)
          .call();
        if (info[1] === scrollType) {
          return {
            address: owner,
            tokenId: event.returnValues.scrollId,
            status: false,
            scrollType: info[1],
          };
        }
        return {
          address: null,
          tokenId: null,
          status: null,
          scrollType: null,
        };
      } catch (err) {
        return {
          address: null,
          tokenId: null,
          status: null,
          scrollType: null,
        };
      }
    })
  );

  functions.logger.log(jsonForCsv);

  const fields = ["address", "tokenId", "scrollType", "status"];
  const opts = { fields };

  try {
    const csv = parse(jsonForCsv, opts);
    res.set("Content-Type", "text/csv");
    res.status(200).send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
};

/**
 * @dev function to delete a magic scroll, but can only proceed if the sender is the owner
 */
const deleteMagicScroll = async (req, res) => {
  // Grab the text parameter.
  const addressShop = req.params.address;
  const tokenId = req.params.tokenId;

  const web3 = createAlchemyWeb3(functions.config().web3.api);

  const token = req.headers.authorization;
  const { address, body } = await Web3Token.verify(token);
  const userAddress = web3.utils.toChecksumAddress(address);

  const ownable = new web3.eth.Contract(ownableABI, addressShop);
  const ownerOfShop = await ownable.methods.owner().call();

  if (userAddress !== ownerOfShop) {
    res.status(403).send("Unauthorized");
    return;
  }
  // Push the new message into Firestore using the Firebase Admin SDK.
  await admin
    .firestore()
    .collection(`MagicShop/${addressShop}/tokens`)
    .doc(tokenId)
    .delete();

  // Send back a message that we've successfully written the message
  res.json({
    result: "Successful",
  });
};

/**
 * @dev function to delete a magic shop, but can only proceed if the sender is the owner
 */
const deleteMagicShop = async (req, res) => {
  // Grab the text parameter.
  const addressShop = req.params.address;
  const web3 = createAlchemyWeb3(functions.config().web3.api);

  const token = req.headers.authorization;
  const { address, body } = await Web3Token.verify(token);
  const userAddress = web3.utils.toChecksumAddress(address);

  const ownable = new web3.eth.Contract(ownableABI, addressShop);
  const ownerOfShop = await ownable.methods.owner().call();

  if (userAddress !== ownerOfShop) {
    res.status(403).send("Unauthorized");
    return;
  }
  await deleteCollection(
    admin.firestore(),
    `MagicShop/${addressShop}/tokens`,
    9999
  );
  await admin.firestore().collection(`MagicShop`).doc(addressShop).delete();
  // Send back a message that we've successfully written the message
  res.json({
    result: "Successful",
    removed: addressShop,
  });
};

shop.use(cors);
shop.use(validateWeb3Token);
shop.post("/addMagicScroll", addMagicScroll);
shop.post("/deleteMagicShop/:address", deleteMagicShop);
shop.post("/deleteMagicScroll/:address/:tokenId", deleteMagicScroll);

shop.post("/round", addRound);
shop.get("/round/:addressM/:addressC/:tokenId", getRound);

shop.get("/csv/:addressM/:tokenType/:password", getMagicScrollsCsv);

exports.shop = functions.https.onRequest(shop);
