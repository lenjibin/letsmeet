var express = require('express');
var fs = require('fs');
var google = require('googleapis');
var path = require('path');
var helpers = require('./main/helpers');
var creds = require('./main/google_credentials');
var app = express();

var emailToAuth = {};

app.use(express.static('static'));

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'main/index.html'));
});

app.get('/ask', function(req, res) {
  creds.getGoogleDevCredentials(function(credentials) {
    creds.getNewOAuth2Client(credentials, req.get('host'), function(oauth2Client) {
      res.redirect(oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.readonly']
      }));
    });
  });
});

app.get('/auth', function(req, res) {
  var code = req.query.code;
  creds.getOAuth2ClientWithToken(code, req.get('host'), storeAuthToken);
  res.redirect('/');
});

app.get('/compare', function(req, res) {
  var dayInMinutes = 1440;

  var user1 = req.query.user1;
  var user2 = req.query.user2;
  var auth1 = emailToAuth[user1];
  var auth2 = emailToAuth[user2];
  var googleCalendarApi = google.calendar('v3');
  googleCalendarApi.calendarList.list({
    auth: auth1
  }, function(err, response) {
    if (err) {
      console.log('Calendar list API returned an error: ' + err);
      return;
    }
    var calendars1 = response.items;
    googleCalendarApi.calendarList.list({
      auth: auth2
    }, function(err, response) {
      if (err) {
        console.log('Calendar list API returned an error: ' + err);
        return;
      }
      var calendars2 = response.items;
      findMutualTime(auth1, auth2, calendars1, calendars2, dayInMinutes);
    });
  });
  res.redirect('/');
});

app.set('port', (process.env.PORT || 3000));
var server = app.listen(app.get('port'), function() {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});

function storeAuthToken(auth) {
  var googleCalendarApi = google.calendar('v3');
  var email;
  googleCalendarApi.calendars.get({
    auth: auth,
    calendarId: 'primary'
  }, function(err, response) {
    email = response.id;
    emailToAuth[email] = auth;
    console.log("auth token for %s stored", email);
  });
}

function findMutualTime(auth1, auth2, calendars1, calendars2, searchLength) {
  var TimeBlock = function(start, end) {
    this.start = start;
    this.end = end;
  };

  var CalendarEvents = function() {
    this.events = [];
    this.allDayEvents = []; // TODO: these are currently not used. in the future will wnat to ask to make sure none of the all day events conflict.
  }

  var calendar1Events = new CalendarEvents();
  var calendar2Events = new CalendarEvents();
  helpers.asyncLoop(calendars1.length, function(loop) {
    handleCalendar(auth1, calendars1[loop.iteration()], calendar1Events, function() { loop.next(); });
  }, function() {
    helpers.asyncLoop(calendars2.length, function(loop) {
      handleCalendar(auth2, calendars2[loop.iteration()], calendar2Events, function() { loop.next(); });
    }, function() {
      var startingTimeBlock = new TimeBlock(new Date(), new Date(new Date().getTime() + searchLength*60000));
      var timeBlocks = [startingTimeBlock];
      timeBlocks = applyOccupiedTimeBlocks(timeBlocks, calendar1Events.events);
      timeBlocks = applyOccupiedTimeBlocks(timeBlocks, calendar2Events.events);

      console.log(timeBlocks);
    });
  });

  function applyOccupiedTimeBlocks(timeBlocks, calendarEvents) {
    var calendarEvent = calendarEvents.shift();
    while(calendarEvent != null) {
      for (var i = 0; i < timeBlocks.length; i++) {
        timeBlocks[i] = newTimeBlocks(timeBlocks[i], new TimeBlock(new Date(calendarEvent.start.dateTime), new Date(calendarEvent.end.dateTime)));
      }
      timeBlocks = [].concat.apply([], timeBlocks);
      calendarEvent = calendarEvents.shift();
    }
    return timeBlocks;
  }

  function newTimeBlocks(originalTimeBlock, occupiedTimeBlock) {
    if (occupiedTimeBlock.start < originalTimeBlock.start && occupiedTimeBlock.end > originalTimeBlock.start) {
      return new TimeBlock(occupiedTimeBlock.end, originalTimeBlock.end);
    } else if (occupiedTimeBlock.end > originalTimeBlock.end && occupiedTimeBlock.start < originalTimeBlock.end) {
      return new TimeBlock(originalTimeBlock.start, occupiedTimeBlock.start);
    } else if (occupiedTimeBlock.start > originalTimeBlock.start && occupiedTimeBlock.end < originalTimeBlock.end) {
      return [new TimeBlock(originalTimeBlock.start, occupiedTimeBlock.start), new TimeBlock(occupiedTimeBlock.end, originalTimeBlock.end)];
    } else {
      return originalTimeBlock;
    }
  }

  function handleCalendar(auth, calendar, calendarEvents, callback) {
    var googleCalendarApi = google.calendar('v3');
    if (calendar.id.indexOf('#') == -1) {
      googleCalendarApi.events.list({
        auth: auth,
        calendarId: calendar.id,
        timeMin: new Date().toISOString(),
        timeMax: new Date(new Date().getTime() + searchLength*60000).toISOString(),
        timeZone: 'Atlantic/Reykjavik',
        singleEvents: true,
        orderBy: 'startTime'
      }, function(err, response) {
        if (err) {
          console.log('The API returned an error: ' + err);
          return;
        }
        var events = response.items;
        for (var i = 0; i < events.length; i++) {
          var event = events[i];
          if (event.start.dateTime == null) {
            calendarEvents.allDayEvents.push(event);
          } else {
            calendarEvents.events.push(event);
          }
        }
        callback();
      });
    } else {
      callback();
    }
  }
}

// TODO: write functions that :
// TODO: remove blocks of time that are not within hourOfDayMin and hourOfDayMax
// TODO: check which time blocks are longer than hangoutLength
