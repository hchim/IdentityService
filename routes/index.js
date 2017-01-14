/**
 * Created by huiche on 1/12/17.
 */
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var User = require("../models/User");
var bcrypt = require('bcrypt');

const saltRounds = 10;

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
                //TODO generate access token
                res.json({
                    "userId": user._id,
                    "nickName": user.nickName,
                    "headerImageUrl": user.headerImageUrl,
                    "emailVerified": user.emailVerified,
                    "createTime": user.createTime,
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
            });

            user.save(function (err, user) {
                if (err) {
                    return next(err);
                }
                //TODO generate access token
                res.json({
                    "userId": user._id,
                    "nickName": user.nickName,
                    "headerImageUrl": user.headerImageUrl,
                    "emailVerified": user.emailVerified,
                    "createTime": user.createTime,
                });
            });
        }
    });
});

module.exports = router;