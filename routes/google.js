var express = require('express');
var router = express.Router();
var mongoose = require('mongoose')
var User = require("identityservicemodels").User(mongoose.connection);
var GoogleAuth = require('google-auth-library');
var conf = require("../config");
var uuid = require('uuid');
var utils = require('servicecommonutils')
var winston = utils.getWinston(conf.get('env'))

//init redis
var host = conf.get('redis.host')
var port = conf.get('redis.port')
var redisClient = utils.createRedisClient(host, port)

var clientId = conf.get('google.client_id')
var clientSec = conf.get('google.secret')
var auth_token_expire = conf.get('server.session.auth_token_expire');

router.post('/verify-token', function (req, res, next) {
    var email = req.body.email;
    var idToken = req.body.idToken;
    var userName = req.body.userName;

    var auth = new GoogleAuth;
    // the other two parameters (CLIENT_SECRET and REDIRECT_URL) are not needed
    var client = new auth.OAuth2(clientId, clientSec, '');

    // https://github.com/google/google-auth-library-nodejs/blob/master/lib/auth/oauth2client.js
    // Or, if multiple clients access the backend:
    //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3],
    client.verifyIdToken(idToken, clientId, function(e, login) {
        if (e) {
            winston.log('error', 'Invalid google id token: ' + idToken, e)
            return res.json(utils.encodeResponseBody(req, {
                "message": "Invalid google ID Token.",
                "errorCode": "INVALID_ID_TOKEN"
            }));
        }
        // verify succesfully
        // var payload = login.getPayload();
        // var userid = payload['sub'];

        var user = new User({
            "email": email,
            "nickName": userName,
            "headerImageUrl": null,
            "emailVerified": true,
            "openidProvider": 'Google',
            "google_meta": {
                "idToken": idToken
            }
        });

        User.getOrCreate(user, function (err, user) {
            if (err) {
                winston.log('error', 'Failed to get user', err)
                return next(err);
            }

            var accessToken = uuid.v4();
            redisClient.set(accessToken, user._id.toString());
            redisClient.expire(accessToken, auth_token_expire)
            return res.json(utils.encodeResponseBody(req, {
                "userId": user._id,
                "nickName": user.nickName,
                "headerImageUrl": user.headerImageUrl,
                "emailVerified": user.emailVerified,
                "createTime": user.createTime,
                "accessToken": accessToken
            }));
        })
    })
})

module.exports = router;