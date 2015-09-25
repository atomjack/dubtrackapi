(function() {
  var __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };
  var phantom = require('phantom');
  var EventEmitter = require('events').EventEmitter;
  var __hasProp = {}.hasOwnProperty;
  var http = require('http');
  var net = require('net');
  var util = require('util');


  DubtrackAPI = (function(_super) {
    __extends(DubtrackAPI, _super);

    function DubtrackAPI(creds) {
      this.creds = creds;
      this.page = false;
      this.pageReady = false;
      this.loggedin = false;
      this.cookies = {};
      this.ph = false;

      this.userLevels = {
        USER: 0,
        MOD: 1,
        CREATOR: 2,
        ADMIN: 3
      };

      this.phantomPort = 12300; // default phantom port
    };

    DubtrackAPI.prototype.connect = function(room) {
      console.log("connecting to " + room);
      var self = this;
      if(this.ph === false) {
        // Need to create page
        this.createPage(room, function(ph) {
          self.ph = ph;
          self.connect(room);
        });
      } else {
        this.openPage(room);
      }
    };

    DubtrackAPI.prototype.chat = function(msg) {
      this.page.evaluate(function(msg) {
        $('#chat-txt-message').val(msg);
        $('.pusher-chat-widget-send-btn').click();
      }, function() {

      }, msg);
    };

    DubtrackAPI.prototype.openPage = function(room) {
      var self = this;


      this.ph.createPage(function (page) {

        self.ph.addCookie('connect.sid', self.creds, '.dubtrack.fm');

        page.set('onError', function(msg, trace) {
          console.log("Page Error: ,", msg);
          console.log("Error Trace: ", trace);
        });
        console.log("opening page");

        page.open('https://www.dubtrack.fm/join/' + room, function(status) {
          self.page = page;

          console.log("status: ", status);
          page.includeJs('https://raw.githubusercontent.com/uzairfarooq/arrive/master/src/arrive.js', function() {
            setTimeout(function() {
              page.evaluate(function(data) {
                var currentChat = false;

                var currentTrack = $('li.infoContainer span.currentSong').html();
                var username = $('li.imgEl img').attr('alt');
                var currentDJ = currentTrack.split(" - ");
                var users = {};
                $('ul.avatar-list li').each(function() {
                  var user = {};
                  user.username = $(this).find('img').attr('alt');
                  if($(this).hasClass('admin'))
                    user.level = data.userLevels.CREATOR;
                  else if($(this).hasClass('creator'))
                    user.level = data.userLevels.CREATOR;
                  else if($(this).hasClass('mod'))
                    user.level = data.userLevels.MOD;
                  else
                    user.level = data.userLevels.USER;
                  users[user.username] = user;
                });
                console.log("DubtrackAPI: " + JSON.stringify({
                  event: 'ready',
                  currentDJ: username,
                  currentTrack: {
                    artist: currentDJ[0],
                    track: currentDJ[1]
                  },
                  users: users
                }));

                setInterval(function() {
                  var newTrack = $('li.infoContainer span.currentSong').html();
                  if(newTrack !== currentTrack) {
                    currentTrack = newTrack;
                    var username = $('li.imgEl img').attr('alt');
                    var foo = currentTrack.split(" - ");
                    var obj = {
                      event: 'djAdvance',
                      username: username,
                      artist: foo[0],
                      track: foo[1]
                    };
                    console.log("DubtrackAPI: " + JSON.stringify(obj));
                  }
                }, 5000);

                // emit chat events
                $('ul.chat-main').arrive('li', function() {
                  if(currentChat !== $(this).find('.text')) {
                    if(currentChat !== false)
                      currentChat.unbindArrive();
                    currentChat = $(this).find('.text');
                    currentChat.arrive('p', function() {
                      var text = $(this).html();
                      var bar = currentChat.find('p:first').html().replace(/<a.* class="username">([^<]+):<\/a> /, '');
                      var username = RegExp.$1;
                      console.log("DubtrackAPI: " + JSON.stringify({
                        event: 'chat',
                        username: username,
                        text: text
                      }));
                    });
                  }

                  var text = $(this).find('.text p').html();
                  if(typeof text === 'object') {
                    text = text.replace(/<a.* class="username">([^<]+):<\/a> /, '');
                    var username = RegExp.$1;
                    var obj = {
                      event: 'chat',
                      username: username,
                      text: text
                    };
                    var output = "DubtrackAPI: " + JSON.stringify(obj);
                    console.log(output);
                  }
                });



                return true;
              }, function() {
              }, {
                userLevels: self.userLevels
              });
            }, 3000);

            page.set('onConsoleMessage', function(msg) {
              if(!msg.match(/^The page at/)) {
                //console.log("console message: ", msg);
              }
              var re = new RegExp("^DubtrackAPI: (.+)");
              if(msg.match(re)) {
                var obj = JSON.parse(RegExp.$1);
                self.emit(obj.event, obj);
              }
            });

          });

        });


      });
    };

    DubtrackAPI.prototype.createPage = function(room, callback) {
      var self = this;
      var phantomOptions = {
        port: self.phantomPort,
        'ignore-ssl-errors': 'yes'
      };
      phantom.create("--ssl-protocol=TLSv1", phantomOptions, function(ph) {
        ph.get('version', function(result) {
          if(result.major < 2) {
            var version = result.major + "." + result.minor + "." + result.patch;
            console.log("Sorry, but PlugBotAPI requires phantomjs version >= 2.0.0. You are running version " + version + ".");
            ph.exit();
            process.exit(1);
          }
        });

        if(typeof callback == 'function')
          callback(ph);
      });
    };



    return DubtrackAPI;
  })(EventEmitter);

  module.exports = DubtrackAPI;
}).call(this);