var express = require('express');
var router = express.Router();
var mongoose = require('mongoose')
var User = require("identityservicemodels").User(mongoose.connection);
var conf = require("../config");
var request = require('request');
var uuid = require('uuid');
var utils = require('servicecommonutils')
var metric = require('metricsclient')(conf)

//init redis
var host = conf.get('redis.host')
var port = conf.get('redis.port')
var redisClient = utils.createRedisClient(host, port)

var clientId = conf.get('wechat.app_id')
var clientSec = conf.get('wechat.secret')
var auth_token_expire = conf.get('server.session.auth_token_expire');

router.post('/verify-token', function (req, res, next) {
    metric.increaseCounter('IdentityService:Usage:Auth:WechatVerifyToken', function (err, jsonObj) {
        if (err != null)
            winston.log('error', err.message, err);
    })
    var code = req.body.code;
    var url = 'https://api.weixin.qq.com/sns/oauth2/access_token?appid=' + clientId
        + '&secret=' + clientSec
        + '&code=' + code
        + '&grant_type=authorization_code';

    request.get({url: url }, function (err, resp, body) {
        if (err) return next(err);

        var jsonObj = JSON.parse(body);
        if (jsonObj['errcode']) {
            return res.json(utils.encodeResponseBody(req, {
                "message": "Invalid wechat code.",
                "errorCode": "INVALID_ID_TOKEN"
            }));
        } else {
            //use openid@sleepaiden.com as the email
            var openid = jsonObj['openid']
            var email = openid + '@sleepaiden.com'
            var wechatAccessToken = jsonObj['access_token']
            var wechatRefreshToken = jsonObj['refresh_token']
            User.findOne({ 'email': email , 'active': true}, function (err, user) {
                if (err) {
                    return next(err);
                }

                if (user) { //user already exists
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
                } else {
                    var user_url = 'https://api.weixin.qq.com/sns/userinfo?access_token=' + wechatAccessToken
                        + '&openid=' + openid
                    // get wechat userinfo
                    request.get({url: user_url }, function (err, resp, body) {
                        if (err) {
                            return next(err)
                        }

                        var userJson = JSON.parse(body);
                        var user = new User({
                            "email" : email,
                            "nickName" : userJson['nickname'],
                            "headerImageUrl": userJson['headimgurl'],
                            "emailVerified": true,
                            "openidProvider": 'Wechat',
                            "wechat_meta": {
                                openid: openid,
                                accessToken: wechatAccessToken,
                                refreshToken: wechatRefreshToken,

                            }
                        });

                        user.save(function (err, user) {
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
                    })
                }
            })
        }
    })//end request
})

module.exports = router;