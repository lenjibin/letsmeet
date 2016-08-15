var express = require('express');
var path = require('path');
var google = require('googleapis');
var fs = require('fs');
var app = express();

app.use(express.static('static'));

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/ask', function(req, res) {
  getGoogleDevCredentials(function(credentials) {
    getNewOAuth2Client(credentials, req.get('host'), function(oauth2Client) {
      getAuthUrl(oauth2Client, function(authUrl) {
        res.redirect(authUrl);
      });
    });
  });
});

app.get('/auth', function(req, res) {
  var code = req.query.code;
  getOAuth2ClientWithToken(code, req.get('host'), listEvents);
  res.redirect('/');
});

app.set('port', (process.env.PORT || 3000));
var server = app.listen(app.get('port'), function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});

function getGoogleDevCredentials(callback) {
  fs.readFile('static/client_secret.json', function processClientSecret(err, content) {
    if (err) {
      console.log('Error loading client secret file: ' + err);
      return;
    }
    callback(JSON.parse(content));
  });
}

function getNewOAuth2Client(credentials, reqHost, callback) {
  var clientSecret = credentials.web.client_secret;
  var clientId = credentials.web.client_id;
  var redirectUrl = "http://" + path.join(reqHost, "auth").toString();
  var oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUrl);
  callback(oauth2Client);
}

function getAuthUrl(oauth2Client, callback) {
  callback(oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly']
  }));
}

function getOAuth2ClientWithToken(code, reqHost, callback) {
  getGoogleDevCredentials(function(credentials) {
    getNewOAuth2Client(credentials, reqHost, function(oauth2Client) {
      // TODO: look up if we already have a token stored for the current user, and if we do:
      //   use that token as the credentials, then call the callback
      getNewToken(oauth2Client, code, callback);
    });
  });

  function getNewToken(oauth2Client, code, callback) {
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      // TODO: store token in db (lookup by email)
      callback(oauth2Client);
    });
  }
}

function listEvents(auth) {
  var calendar = google.calendar('v3');
  calendar.calendarList.list({
    auth: auth
  }, function(err, response) {
    if (err) {
      console.log('Calendar list API returned an error: ' + err);
      return;
    }
    var calendars = response.items;
    for (var calendars_i = 0; calendars_i < calendars.length; calendars_i++) {
      var calendarId = calendars[calendars_i].id;
      console.log(calendarId);
      (function(index) {
        if (calendarId.indexOf('#') == -1) {
          calendar.events.list({
            auth: auth,
            calendarId: calendarId,
            timeMin: (new Date()).toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime'
          }, function(err, response) {
            if (err) {
              console.log('The API returned an error: ' + err);
              return;
            }

            console.log('---------------------' + calendars[index].summary + '---------------------');
            var events = response.items;
            if (events.length == 0) {
              console.log('No upcoming events found.');
            } else {
              console.log('Upcoming 10 events:');
              for (var i = 0; i < events.length; i++) {
                var event = events[i];
                var start = event.start.dateTime || event.start.date;
                console.log('%s - %s', start, event.summary);
              }
            }
          })
        }
      })(calendars_i);
    }
  });
}
