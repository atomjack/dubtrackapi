An API for creating bots on Dubtrack.fm.

This API is just beginning, and since Dubtrack has no Javascript API, features are very limited.

First, you must log in to Dubtrack with the account you want the bot to login as. View the cookies in your browser and get the value of the "connect.sid" cookie. It will look something like `s%Bp46VM86r0gns4w2krwtQ86JiROoNorcapnylGMTdG9qvs3rfs9YOCacdhFl2MlRCr4e8uM8LuP905RP`.

`
var DubtrackAPI = require('./dubtrackapi');
var creds = '...';

var bot = new DubtrackAPI(creds);

bot.connect('chillout-mixer'); // specify the room name part of the url for the room

bot.on('ready', function(data) {
  console.log("Ready to go: ", data);
  // data contains the currentDJ (by name) and currentTrack (artist and track)
});

bot.on('chat', function(data) {
  console.log("got chat: ", data);
});

bot.on('djAdvance', function(data) {
  console.log("new song playing: ", data);
});
`