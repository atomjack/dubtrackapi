An API for creating bots on Dubtrack.fm.

This API is just beginning, and since Dubtrack has no Javascript API, features are very limited.

`phantomjs` and `phantomjs-node` are required. Right now, the API requires phantomjs version 2.0 or greater. Version 1.x hasn't been tested. Please let me know if you get it to work with 1.x.

First, you must log in to Dubtrack with the account you want the bot to login as. View the cookies in your browser and get the value of the "connect.sid" cookie. It will look something like `s%Bp46VM86r0gns4w2krwtQ86JiROoNorcapnylGMTdG9qvs3rfs9YOCacdhFl2MlRCr4e8uM8LuP905RP`.

```
var DubtrackAPI = require('./dubtrackapi');
var creds = '...'; // Put the value of the connect.sid cookie here

var bot = new DubtrackAPI(creds);

bot.connect('chillout-mixer'); // specify the room name part of the url for the room

bot.on('ready', function(data) {
  console.log("Ready to go: ", data);
  // data contains the currentDJ (by name) and currentTrack (artist and track), and the list of users in the room (does not update on join/depart)
});

bot.on('chat', function(data) {
  console.log("got chat: ", data);
});

bot.on('djAdvance', function(data) {
  console.log("new song playing: ", data);
});
```