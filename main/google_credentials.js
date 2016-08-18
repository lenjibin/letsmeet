var fs = require('fs');
var google = require('googleapis');
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

function getOAuth2ClientWithToken(code, requestHost, callback) {
  getGoogleDevCredentials(function(credentials) {
    getNewOAuth2Client(credentials, requestHost, function(oauth2Client) {
      // TODO: look up if we already have a token stored for the current user, and if we do:
      //   use that token as the credentials, then call the callback
      //   If we dont : call get new token.
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

module.exports.getGoogleDevCredentials = getGoogleDevCredentials;
module.exports.getNewOAuth2Client = getNewOAuth2Client;
module.exports.getOAuth2ClientWithToken = getOAuth2ClientWithToken;

