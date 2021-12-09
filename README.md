# magic-shop-back

Firebase Functions + Alchemy web3 + Web3-token

APIs in this repository can be accessed with Authorization tokens and APIs are restricted to the magic shop owner only

## List of APIs

### Currently using APIS
#### POST
```
Path: /addMagicScroll
Request's body example:
{
    "url": "https://firebasestorage.googleapis.com/v0/b/deguild-2021.appspot.com/o/images%2F10.png?alt=media",
    "address": "0xFA0Db8E0f8138A1675507113392839576eD3052c",
    "tokenId": "0",
    "name": "Introduction to Computer Programming",
    "courseId":"ICCS101",
    "description": "Roles of algorithms in problem solving; concepts of data types, including integers, floating- point numbers, and strings; statements and expressions; simple input output; conditionals and control-flow; iteration, including loops and recursion; functions; basic collections, including resizable arrays and dictionaries; classes and mechanics of object-oriented programming"
}
```
```
Path: /deleteMagicShop/:address
```
```
Path: /deleteMagicScroll/:address/:tokenId
```
```
Path: /round
Request's body example:
{
    addressM: shopAddress,
    addressC: downloading.course.address,
    tokenId: downloading.course.tokenId,
    coursePassword: state.newRound,
}
```
#### GET
```
/round/:addressM/:addressC/:tokenId
/csv/:addressM/:tokenType/:password
```
## Deployment
Use this to develop your code locally

    firebase emulators:start 

Use this to deploy

    firebase deploy