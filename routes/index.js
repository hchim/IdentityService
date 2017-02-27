/**
 * Created by huiche on 1/12/17.
 */
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var User = require("../models/User");
var bcrypt = require('bcrypt');
var nodemailer = require('nodemailer');
var conf = require("../config");
var rs = require("randomstring");
var uuid = require('node-uuid');
var redis = require('redis')
var metric = require('metricsclient')

require("string-format-js");

const saltRounds = 10;
var transporter = nodemailer.createTransport({
    transport: 'ses',
    accessKeyId: conf.get('aws.ses.accessKeyId'),
    secretAccessKey: conf.get('aws.ses.secretAccessKey')
});

//init redis
var host = conf.get('redis.host')
var port = conf.get('redis.port')
var redisClient = redis.createClient(port, host);
redisClient.on("error", function (err) {
    console.log("Create redis client Error: " + err);
    metric.errorMetric('IdentityService:Error:redis', err, function (err, res) {
        //nothing
    })
});

router.get('/healthy', function (req, res, next) {
    if (mongoose.connection.readyState == 1) {
        res.json({"healthy": true});
    } else {
        res.json({"healthy": false});
    }
});

/*
 Login and generate access token.
 */
router.post('/login', function (req, res, next) {
    var email = req.body.email;
    var password = req.body.password;

    User.findOne({ 'email': email }, function (err, user) {
        if (err) {
            return next(err);
        }

        if (user == null) {
            res.json({
                "message": "User account does not exist.",
                "errorCode": "ACCOUNT_NOT_EXIST"
            });
        } else {
            //TODO check user.active
            if (bcrypt.compareSync(password, user.passwordHash)) {
                var accessToken = uuid.v4();
                //add accessToken to redis
                redisClient.set(accessToken, user._id);
                res.json({
                    "userId": user._id,
                    "nickName": user.nickName,
                    "headerImageUrl": user.headerImageUrl,
                    "emailVerified": user.emailVerified,
                    "createTime": user.createTime,
                    "accessToken": accessToken
                });
            } else {
                res.json({
                    "message": "Wrong password.",
                    "errorCode": "WRONG_PASSWORD"
                });
            }
        }
    });
});

/*
 Register a user account.
 */
router.post('/register', function(req, res, next) {
    User.findOne({ 'email': req.body.email }, function (err, user) {
        if (err) {
            return next(err);
        }

        if (user != null) {
            res.json({
                "message": "Email was already registered.",
                "errorCode": "EMAIL_USED"
            });
        } else {
            var salt = bcrypt.genSaltSync(saltRounds);
            var hash = bcrypt.hashSync(req.body.password, salt);

            var user = new User({
                "email" : req.body.email,
                "nickName" : req.body.nickName,
                "headerImageUrl": null,
                "salt": salt,
                "passwordHash": hash,
                "verifyCode": rs.generate({length: 4, charset: 'numeric'})
            });

            user.save(function (err, user) {
                if (err) {
                    return next(err);
                }
                // send register success email
                var mailOptions = {
                    from: conf.get('email.from_email'),
                    to: user.email,
                    subject: conf.get('email_template.register.subject'),
                    html: conf.get('email_template.register.html')
                        .format(user.nickName, user.activateCode)
                };
                transporter.sendMail(mailOptions, function(error, info){
                    if(error){
                        return console.log(error);
                    }
                });

                var accessToken = uuid.v4();
                //add accessToken to redis
                redisClient.set(accessToken, user._id);
                res.json({
                    "userId": user._id,
                    "nickName": user.nickName,
                    "headerImageUrl": user.headerImageUrl,
                    "emailVerified": user.emailVerified,
                    "createTime": user.createTime,
                    "accessToken": accessToken
                });
            });
        }
    });
});

router.post('/reset-email', function (req, res, next) {
    var email = req.body.email;

    User.findOne({ 'email': email }, function (err, user) {
        if (err) {
            return next(err);
        }

        if (user == null) {
            res.json({
                "message": "User account does not exist.",
                "errorCode": "ACCOUNT_NOT_EXIST"
            });
        } else {
            user.securityCode = rs.generate({length: 6});
            user.save(function (err) {
                if (err) return next(err);
                var mailOptions = {
                    from: conf.get('email.from_email'),
                    to: user.email,
                    subject: conf.get('email_template.reset_email.subject'),
                    html: conf.get('email_template.reset_email.html')
                        .format(user.nickName, user.securityCode)
                };
                console.log(mailOptions);
                transporter.sendMail(mailOptions, function(error, info){
                    if(error){
                        return console.log(error);
                    }
                    console.log('Message sent: ' + info.response);
                });
                res.json({
                    userId: user._id
                });
            });
        }
    });
});

router.post('/reset-pswd', function (req, res, next) {
    var email = req.body.email;

    User.findOne({ 'email': email }, function (err, user) {
        if (err) {
            return next(err);
        }

        if (user == null) {
            res.json({
                "message": "User account does not exist.",
                "errorCode": "ACCOUNT_NOT_EXIST"
            });
        } else {
            if (user.securityCode && user.securityCode == req.body.securityCode) {
                user.salt = bcrypt.genSaltSync(saltRounds);
                user.passwordHash = bcrypt.hashSync(req.body.newPassword, user.salt);
                user.save(function (err) {
                    if (err) return next(err);
                    res.json({userId: user._id});
                });
            } else {
                res.json({
                    "message": "Wrong security code.",
                    "errorCode": "WRONG_SECURITY_CODE"
                });
            }
        }
    });
});

module.exports = router;