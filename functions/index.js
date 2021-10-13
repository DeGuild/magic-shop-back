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

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

const addMagicScroll = async (req, res) => {
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
};

const readMagicScroll = async (req, res) => {
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
};

const deleteMagicScroll = async (req, res) => {
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
};

const deleteMagicShop = async (req, res) => {
  // Grab the text parameter.
  const address = req.body.address;
  // Push the new message into Firestore using the Firebase Admin SDK.
  await admin.firestore().collection("MagicShop/").doc(address).delete();

  // Send back a message that we've successfully written the message
  res.json({
    result: "Successful",
  });
};

const allMagicShops = async (req, res) => {
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
};

shop.use(cors);
shop.post("/addMagicScroll", addMagicScroll);
shop.get("/readMagicScroll/:address", readMagicScroll);
shop.post("/deleteMagicShop", deleteMagicShop);
shop.post("/deleteMagicScroll", deleteMagicScroll);
shop.get("/allMagicShops/:address/:direction", allMagicShops);
shop.get("/allMagicShopsOnce", allMagicShops);

exports.shop = functions.https.onRequest(shop);
