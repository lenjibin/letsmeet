var fs = require('fs');
var google = require('googleapis');
var MongoClient = require('mongodb').MongoClient;
var path = require('path');

function getGoogleDevCredentials(callback) {
  fs.readFile('secret/client_secret.json', function processClientSecret(err, content) {
    if (err) {
      console.log('Error loading client secret file: ' + err);
      return;
    }
    callback(JSON.parse(content));
  });
}

function getNewOAuth2Client(credentials, requestHost, callback) {
  var clientSecret = credentials.web.client_secret;
  var clientId = credentials.web.client_id;
  var redirectUrl = "http://" + path.join(requestHost, "auth").toString();
  var oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUrl);
  callback(oauth2Client);
}

function getOAuth2ClientWithToken(code, requestHost, mongoDbURI) {
  getGoogleDevCredentials(function(credentials) {
    getNewOAuth2Client(credentials, requestHost, function(oauth2Client) {
      getToken(oauth2Client, code, mongoDbURI);
    });
  });
}

function getToken(oauth2Client, code, mongoDbURI) {
  oauth2Client.getToken(code, function(err, token) {
    if (err) {
      console.log('Error while trying to retrieve access token', err);
      return;
    }
    oauth2Client.credentials = token;
    var googleCalendarApi = google.calendar('v3');
    var email;
    googleCalendarApi.calendars.get({
      auth: oauth2Client,
      calendarId: 'primary'
    }, function(err, response) {
      if (err) {
        console.log("This should never error. Could not get account's primary caldendar: " + err);
      } else {
        email = response.id;
        storeAuthToken(email, token, mongoDbURI);
      }
    });
  });
}

function storeAuthToken(email, token, mongoDbURI) {
  MongoClient.connect(mongoDbURI, function(err, db) {
    if (err) {
      console.log('could not connect to mongodb: ', mongoDbURI);
    } else {
      console.log('connected to db');

      var oauthTokensCollection = db.collection('oauth_tokens');
      oauthTokensCollection.findOne({email: email}, function(err, res) {
        if (err) {
          console.log(err);
          db.close();
        } else if (res) {
          console.log("did not store new auth token: already found auth token for %s", email);
          db.close();
        } else {
          oauthTokensCollection.insert({
            email: email,
            token: token
          }).then(function(res) {
            console.log("auth token for %s stored with id: %s", email, res.insertedIds.pop());
            db.close();
          });
        }
      });
    }
  });
}

module.exports.getGoogleDevCredentials = getGoogleDevCredentials;
module.exports.getNewOAuth2Client = getNewOAuth2Client;
module.exports.getOAuth2ClientWithToken = getOAuth2ClientWithToken;
