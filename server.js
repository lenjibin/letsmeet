var bodyParser = require('body-parser');
var express = require('express');
var fs = require('fs');
var google = require('googleapis');
var MongoClient = require('mongodb').MongoClient;
var path = require('path');
var helpers = require('./main/helpers');
var creds = require('./main/google_credentials');
var core = require('./main/core');
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/node_modules/moment', express.static('node_modules/moment'));
app.use('/node_modules/angular', express.static('node_modules/angular'));
app.use(express.static('static/js'));
app.use(express.static('static/css'));
app.use(express.static('static/images'));

var mongoDbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/letsmeet';

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'main/index.html'));
});

app.get('/ask', function(req, res) {
  creds.getGoogleDevCredentials(function(credentials) {
    creds.getNewOAuth2Client(credentials, req.get('host'), function(oauth2Client) {
      res.redirect(oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar.readonly'],
        approval_prompt: 'force'
      }));
    });
  });
});

app.get('/auth', function(req, res) {
  var code = req.query.code;
  creds.getOAuth2ClientWithToken(code, req.get('host'), mongoDbURI);
  res.redirect('/');
});

app.post('/compare', function(req, res) {
  var user1 = req.body.user1;
  var user2 = req.body.user2;
  var searchLengthInMinutes = req.body.searchLengthInMinutes;
  var hourOfDayMin = req.body.hourOfDayMin;
  var hourOfDayMax = req.body.hourOfDayMax;
  var hangoutLengthInMinutes = req.body.hangoutLengthInMinutes;
  var googleCalendarApi = google.calendar('v3');

  MongoClient.connect(mongoDbURI, function(err, db) {
    if (err) {
      console.log('could not connect to mongodb: ', mongoDbURI);
    } else {
      console.log('connected to db');

      var oauthTokensCollection = db.collection('oauth_tokens');
      oauthTokensCollection.findOne({email: user1}, function(err1, res1) {
        if (err1) {
          console.log(err1);
          db.close();
        } else if (res1) {
          creds.getGoogleDevCredentials(function(credentials) {
            creds.getNewOAuth2Client(credentials, req.get('host'), function(auth1) {
              auth1.credentials = res1.token;
              oauthTokensCollection.findOne({email: user2}, function(err2, res2) {
                if (err2) {
                  console.log(err2);
                  db.close();
                } else if (res2) {
                  db.close();
                  creds.getNewOAuth2Client(credentials, req.get('host'), function(auth2) {
                    auth2.credentials = res2.token;
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
                } else {
                  console.log("no user 2: %s found", user2);
                  db.close();
                }
              });
            });
          });
        } else {
          console.log("no user 1: %s found", user1);
          db.close();
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
