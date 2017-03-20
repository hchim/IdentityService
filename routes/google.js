var express = require('express');
var router = express.Router();
var User = require("../models/User");
var GoogleAuth = require('google-auth-library');
var conf = require("../config");

router.post('/verify-token', function (req, res, next) {
    var email = req.body.email;
    var idToken = req.body.idToken;
    var userName = req.body.userName;

    var clientId = conf.get('google.client_id')
    var auth = new GoogleAuth;
    // the other two parameters (CLIENT_SECRET and REDIRECT_URL) are not needed
    var client = new auth.OAuth2(clientId, '', '');

    // https://github.com/google/google-auth-library-nodejs/blob/master/lib/auth/oauth2client.js
    client.verifyIdToken(
        idToken,
        client,
        // Or, if multiple clients access the backend:
        //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3],
        function(e, login) {
            if (e) {
                return res.json(utils.encodeResponseBody(req, {
                    "message": "Invalid google ID Token.",
                    "errorCode": "INVALID_ID_TOKEN"
                }));
            }
            // verify succesfully
            // var payload = login.getPayload();
            // var userid = payload['sub'];

            User.findOne({ 'email': email , 'active': true}, function (err, user) {
                if (err) {
                    return next(err);
                }

                if (user == null) {
                    var user = new User({
                        "email" : email,
                        "nickName" : userName,
                        "headerImageUrl": null,
                        "emailVerified": true,
                        "openidProvider": 'Google'
                    });

                    user.save(function (err, user) {
                        if (err) {
                            return next(err);
                        }

                        var accessToken = uuid.v4();
                        //add accessToken to redis
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
                    });
                } else {
                    var accessToken = uuid.v4();
                    //add accessToken to redis
                    redisClient.set(accessToken, user._id.toString());
                    redisClient.expire(accessToken, auth_token_expire)
                    res.json(utils.encodeResponseBody(req, {
                        "userId": user._id,
                        "nickName": user.nickName,
                        "headerImageUrl": user.headerImageUrl,
                        "emailVerified": user.emailVerified,
                        "createTime": user.createTime,
                        "accessToken": accessToken
                    }));
                }
            })

        });
})

module.exports = router;