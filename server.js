var express = require('express');
var fs = require('fs');
var google = require('googleapis');
var path = require('path');
var helpers = require('./main/helpers');
var creds = require('./main/google_credentials');
var core = require('./main/core');
var app = express();

var emailToAuth = {};

app.use('/node_modules/angular', express.static('node_modules/angular'));
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
    } else {
      var calendars1 = response.items;
      googleCalendarApi.calendarList.list({
        auth: auth2
      }, function(err, response) {
        if (err) {
          console.log('Calendar list API returned an error: ' + err);
        } else {
          var calendars2 = response.items;
          var timeBlocks = core.findMutualTime(auth1, auth2, calendars1, calendars2, dayInMinutes);
        }
      });
    }
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
