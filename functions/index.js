/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const express = require("express");
//  const cookieParser = require('cookie-parser')();
const cors = require("cors")({ origin: true });
const shop = express();

const ownableABI = require("./contracts/Ownable.json").abi;
const MagicScrollsPlusABI =
  require("./contracts/MagicShop/V2/IMagicScrolls+.sol/IMagicScrollsPlus.json").abi;

const Web3Token = require("web3-token");
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const { parse } = require("json2csv");

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

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions
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

async function deleteCollection(db, collectionPath, batchSize) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy("__name__").limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

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
  // Push the new message into Firestore using the Firebase Admin SDK.
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

const addRound = async (req, res) => {
  // Grab the text parameter.

  const addressShop = req.body.addressM;
  const addressCertificate = req.body.addressC;
  const certificateToken = req.body.tokenId;
  // const tokenId = parseInt(req.params.tokenId, 10);
  const coursePassword = req.body.coursePassword;
  // Push the new message into Firestore using the Firebase Admin SDK.
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
    .collection(`MagicShop/${addressShop}/rounds`)
    .doc(addressCertificate)
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

const getRound = async (req, res) => {
  // Grab the text parameter.
  const addressShop = req.params.addressM;
  const addressCertificate = req.params.addressC;
  const certificateToken = req.params.tokenId;
  // const tokenId = parseInt(req.params.tokenId, 10);
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

  const readResult2 = await admin
    .firestore()
    .collection(`MagicShop/${addressShop}/rounds`)
    .where("addressCertificate", "==", addressCertificate)
    .where("certificateToken", "==", parseInt(certificateToken, 10))
    .get();
  if (!readResult2) {
    res
      .status(404)
      .json({ message: `There is no round for ${addressCertificate}}` });
    return;
  }

  const data2 = [];
  readResult2.forEach((doc) => {
    data2.push(doc.data());
  });
  functions.logger.log(data2);

  res.json(data2);
};

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
  // Push the new message into Firestore using the Firebase Admin SDK.
  // await admin.firestore().collection(`MagicShop/${address}/tokens`);
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

// TODO: work on these APIs
shop.get("/csv/:addressM/:tokenType/:password", getMagicScrollsCsv);

exports.shop = functions.https.onRequest(shop);
