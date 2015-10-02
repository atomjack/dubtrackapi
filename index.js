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

      this.userPermissions = {
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
        Dubtrack.room.chat._messageInputEl.val(msg);
        Dubtrack.room.chat.sendMessage();
      }, function() {

      }, msg);
    };

    DubtrackAPI.prototype.openPage = function(room) {
      var self = this;


      this.ph.createPage(function (page) {

        var cookie = {
          domain: '.dubtrack.fm',
          name: 'connect.sid',
          value: self.creds
        };
        //self.ph.addCookie('connect.sid', self.creds, '.dubtrack.fm');
        self.ph.addCookie(cookie);
        /*
        page.set('onError', function(msg, trace) {
          console.log("Page Error: ,", msg);
          console.log("Error Trace: ", trace);
        });
        */
        console.log("opening page");

        page.open('https://www.dubtrack.fm/join/' + room, function(status) {
          self.page = page;

          console.log("status: ", status);
          page.includeJs('https://raw.githubusercontent.com/uzairfarooq/arrive/master/src/arrive.js', function() {
            setTimeout(function() {
              page.evaluate(function(data) {
                function debug(msg) {
                  console.log("DubtrackAPI: " + JSON.stringify({
                    event: 'debug',
                    data: msg
                  }));
                }





                var currentChat = false;

                var currentTrack = $('li.infoContainer span.currentSong').html();
                var username = $('li.imgEl img').attr('alt');
                var currentDJ = currentTrack.split(" - ");
                var users = {};
                $('ul.avatar-list li').each(function() {
                  var user = {};
                  user.username = $(this).find('img').attr('alt');
                  if($(this).hasClass('admin'))
                    user.permission = data.userPermissions.CREATOR;
                  else if($(this).hasClass('creator'))
                    user.permission = data.userPermissions.CREATOR;
                  else if($(this).hasClass('mod'))
                    user.permission = data.userPermissions.MOD;
                  else
                    user.permission = data.userPermissions.USER;
                  users[user.username] = user;
                });

                console.log("DubtrackAPI: " + JSON.stringify({
                  event: 'ready',
                  data: {
                    currentDJ: username,
                    currentTrack: {
                      artist: currentDJ[0],
                      track: currentDJ[1]
                    },
                    users: users
                  }
                }));

                // Monitor the current song playing, and emit an event when it changes
                setInterval(function() {
                  var newTrack = $('li.infoContainer span.currentSong').html();
                  if(newTrack !== currentTrack) {
                    currentTrack = newTrack;
                    var username = $('li.imgEl img').attr('alt');
                    var foo = currentTrack.split(" - ");
                    var obj = {
                      event: 'djAdvance',
                      data: {
                        username: username,
                        artist: foo[0],
                        track: foo[1]
                      }
                    };
                    console.log("DubtrackAPI: " + JSON.stringify(obj));
                  }
                }, 5000);

                //Emit all Dubtrack JS API events
                var events = [];
                for(var event in Dubtrack.Events._events) {
                  if(!event.match(/user[-_]update[_-]/)) {
                    events.push(event);
                  }
                }
                debug("events: " + JSON.stringify(events));

                events.forEach(function(event) {
                  debug("binding event for " + event.replace("realtime:", ""));
                  Dubtrack.Events.bind(event, function (data) {
                    console.log("DubtrackAPI: " + JSON.stringify({
                      event: event.replace("realtime:", ""),
                      data: data
                    }));
                  });
                });

              }, function() {

              }, {
                userPermissions: self.userPermissions
              });
            }, 3000);

            page.set('onConsoleMessage', function(msg) {
              if(!msg.match(/^The page at/)) {
                //console.log("console message: ", msg);
              }
              var re = new RegExp("^DubtrackAPI: (.+)");
              if(msg.match(re)) {
                var obj = JSON.parse(RegExp.$1);
                self.emit(obj.event, obj.data);
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

    DubtrackAPI.prototype.getEvents = function(callback) {
      var self = this;
      this.page.evaluate(function() {
        var events = [];
        for(var event in Dubtrack.Events._events) {
          //var event = Dubtrack.Events._events[i];
          if(!event.match(/[a-f0-9]{24}/))
            events.push(event.replace("realtime:", ""));
        }
        return events;
      }, function(events) {
        if(typeof callback === 'function') {
          callback(events);
        }
      });
    };



    return DubtrackAPI;
  })(EventEmitter);

  module.exports = DubtrackAPI;
}).call(this);