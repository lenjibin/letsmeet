var bodyParser = require('body-parser');
var express = require('express');
var fs = require('fs');
var google = require('googleapis');
var path = require('path');
var helpers = require('./main/helpers');
var creds = require('./main/google_credentials');
var core = require('./main/core');
var app = express();

var emailToAuth = {};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/node_modules/moment', express.static('node_modules/moment'));
app.use('/node_modules/angular', express.static('node_modules/angular'));
app.use(express.static('static/js'));
app.use(express.static('static/css'));
app.use(express.static('static/images'));

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

app.post('/compare', function(req, res) {
  var user1 = req.body.user1;
  var user2 = req.body.user2;
  var searchLengthInMinutes = req.body.searchLengthInMinutes;
  var hourOfDayMin = req.body.hourOfDayMin;
  var hourOfDayMax = req.body.hourOfDayMax;
  var hangoutLengthInMinutes = req.body.hangoutLengthInMinutes;
  var auth1 = emailToAuth[user1];
  var auth2 = emailToAuth[user2];
  var googleCalendarApi = google.calendar('v3');
  googleCalendarApi.calendarList.list({
    auth: auth1
  }, function(err, response) {
    if (err) {
      var error = 'Service is not authorized to access calendar list API for user 1: ' + err;
      console.log(error);
      res.status(403).send(error);
    } else {
      var calendars1 = response.items;
      googleCalendarApi.calendarList.list({
        auth: auth2
      }, function(err, response) {
        if (err) {
          var error = 'Service is not authorized to access calendar list API for user 2: ' + err;
          console.log(error);
          res.status(403).send(error);
        } else {
          var calendars2 = response.items;
          core.findMutualTime(auth1, auth2, calendars1, calendars2, searchLengthInMinutes,
                              hangoutLengthInMinutes, hourOfDayMin, hourOfDayMax, function(timeBlocks) {
            res.json(timeBlocks);
          });
        }
      });
    }
  });
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
    if (err) {
      console.log("This should never error. Could not get account's primary caldendar: " + err);
    } else {
      email = response.id;
      emailToAuth[email] = auth;
      console.log("auth token for %s stored", email);
    }
  });
}
