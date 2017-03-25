var express = require('express');
var router = express.Router();
var User = require("../models/User");
var conf = require("../config");
var request = require('request');
var uuid = require('node-uuid');
var utils = require('servicecommonutils')

//init redis
var host = conf.get('redis.host')
var port = conf.get('redis.port')
var redisClient = utils.createRedisClient(host, port)

var clientId = conf.get('facebook.app_id')
var clientSec = conf.get('facebook.secret')
var auth_token_expire = conf.get('server.session.auth_token_expire');

router.post('/verify-token', function (req, res, next) {
    var email = req.body.email;
    var accessToken = req.body.accessToken;
    var userName = req.body.userName;

    var debug_url = 'https://graph.facebook.com/debug_token?input_token=' + accessToken
        + '&access_token=' + clientId + '|' + clientSec;

    request.get({url: debug_url }, function (err, resp, body) {
        if (err) return next(err);

        var jsonObj = JSON.parse(body);
        if (jsonObj['data']['is_valid'] !== true) {
            return res.json(utils.encodeResponseBody(req, {
                "message": "Invalid facebook access Token.",
                "errorCode": "INVALID_ID_TOKEN"
            }));
        } else {
            var user = new User({
                "email" : email,
                "nickName" : userName,
                "headerImageUrl": null,
                "emailVerified": true,
                "openidProvider": 'Facebook'
            });

            User.getOrCreate(user, function (err, user) {
                if (err) {
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
        }
    })//end request
})

module.exports = router;