var express = require('express');
var router = express.Router();
var mongoose = require('mongoose')
var User = require("identityservicemodels").User(mongoose.connection);
var multer  = require('multer')
var conf = require("../config");
var AWS = require('aws-sdk');
var fs = require('fs');
var bcrypt = require('bcrypt');
var utils = require('servicecommonutils')
var validator = require('validator')
var metric = require('metricsclient')(conf)

const saltRounds = 10;

AWS.config.loadFromPath('./config/s3Credential.json');

router.get('/', function (req, res, next) {
    metric.increaseCounter('IdentityService:Usage:User:Get', function (err, jsonObj) {
        if (err != null)
            winston.log('error', err.message, err);
    })
    var id = req.headers['userId'];
    if (!id) {
        return res.json(utils.encodeResponseBody(req, {
            "message": "User id not found.",
            "errorCode": "UNKNOWN_USER"
        }));
    }

  User.findOne({ '_id': id }, function (err, user) {
      if (err) {
          return next(err);
      }

      if (user == null) {
          return res.json(utils.encodeResponseBody(req, {
              "message": "User account does not exist.",
              "errorCode": "ACCOUNT_NOT_EXIST"
          }));
      } else {
          res.json(utils.encodeResponseBody(req, {
              "userId": user._id,
              "nickName": user.nickName,
              "headerImageUrl": user.headerImageUrl,
              "emailVerified": user.emailVerified,
              "createTime": user.createTime,
          }));
      }
  });
});

router.post('/verify-email', function (req, res, next) {
    metric.increaseCounter('IdentityService:Usage:User:VerifyEmail', function (err, jsonObj) {
        if (err != null)
            winston.log('error', err.message, err);
    })
    var id = req.headers['userId'];
    if (!id) {
        return res.json(utils.encodeResponseBody(req, {
            "message": "User id not found.",
            "errorCode": "UNKNOWN_USER"
        }));
    }

  User.findOne({ '_id': id }, function (err, user) {
      if (err) {
          return next(err);
      }

      if (user == null) {
          return res.json(utils.encodeResponseBody(req, {
              "message": "User account does not exist.",
              "errorCode": "ACCOUNT_NOT_EXIST"
          }));
      } else {
          if (req.body.verifyCode == user.verifyCode) {
              user.emailVerified = true;
              user.save(function (err) {
                  if (err) return next(err);
                  res.json(utils.encodeResponseBody(req, {
                      "userId": user._id,
                  }));
              });
          } else {
              res.json(utils.encodeResponseBody(req, {
                  "message": "Wrong verification code.",
                  "errorCode": "WRONG_VERIFY_CODE"
              }));
          }
      }
  });
});

var upload = multer({ dest: conf.get('upload_dir')});

router.post('/update-header', upload.single('image'), function(req, res, next) {
    metric.increaseCounter('IdentityService:Usage:User:UpdateHeader', function (err, jsonObj) {
        if (err != null)
            winston.log('error', err.message, err);
    })
    var id = req.headers['userId'];
    if (!id) {
        return res.json(utils.encodeResponseBody(req, {
            "message": "User id not found.",
            "errorCode": "UNKNOWN_USER"
        }));
    }

    var s3 = new AWS.S3({
        apiVersion: '2006-03-01',
        params: {
            Bucket: conf.get('aws.s3.header.bucket')
        }
    });
    var fileBuffer = fs.readFileSync(req.file.path);

    var params = {
        ACL: 'public-read',
        Body: fileBuffer,
        ContentType: 'image/jpg',
        Key: req.file.filename + '.jpg'
    };

    s3.upload(params, function(err, data) {
        if (err) {
            return next(err);
        }

        User.update(
            {_id: id},
            {$set: {headerImageUrl: data.Location}},
            function (err) {
                if (err) return next(err);
                res.json(utils.encodeResponseBody(req, {"headerImageUrl": data.Location}));
            });
    });
});

router.put('/update-name', function (req, res, next) {
    metric.increaseCounter('IdentityService:Usage:User:UpdateName', function (err, jsonObj) {
        if (err != null)
            winston.log('error', err.message, err);
    })
    var id = req.headers['userId'];
    if (!id) {
        return res.json(utils.encodeResponseBody(req, {
            "message": "User id not found.",
            "errorCode": "UNKNOWN_USER"
        }));
    }

  User.findOne({ '_id': id }, function (err, user) {
      if (err) {
          return next(err);
      }

      if (user == null) {
          return res.json(utils.encodeResponseBody(req, {
              "message": "User account does not exist.",
              "errorCode": "ACCOUNT_NOT_EXIST"
          }));
      } else {
          user.nickName = req.body.nickName;
          user.save(function (err) {
              if (err) return next(err);
              res.json(utils.encodeResponseBody(req, {
                  "userId": user._id,
                  "nickName": user.nickName,
              }));
          });
      }
  });
});

router.put('/update-pswd', function (req, res, next) {
    metric.increaseCounter('IdentityService:Usage:User:UpdatePSWD', function (err, jsonObj) {
        if (err != null)
            winston.log('error', err.message, err);
    })
    var id = req.headers['userId'];
    if (!id) {
        return res.json(utils.encodeResponseBody(req, {
            "message": "User id not found.",
            "errorCode": "UNKNOWN_USER"
        }));
    }

    if (validator.isEmpty(req.body.newPassword)) {
        return res.json(utils.encodeResponseBody(req, {
            "field": "newPassword",
            "message": "new password is empty",
            "errorCode": "VALIDATION_ERROR"
        }))
    }

    User.findOne({ '_id': id }, function (err, user) {
        if (err) {
            return next(err);
        }

        if (user == null) {
            return res.json(utils.encodeResponseBody(req, {
                "message": "User account does not exist.",
                "errorCode": "ACCOUNT_NOT_EXIST"
            }));
        }

        if (!bcrypt.compareSync(req.body.oldPassword, user.passwordHash)) {
            return res.json(utils.encodeResponseBody(req, {
                "message": "Wrong password.",
                "errorCode": "WRONG_PASSWORD"
            }));
        }

        user.salt = bcrypt.genSaltSync(saltRounds);
        user.passwordHash = bcrypt.hashSync(req.body.newPassword, user.salt);
        user.save(function (err) {
            if (err) return next(err);
            res.json(utils.encodeResponseBody(req, {
                "userId": user._id,
            }));
        });
    });
});

module.exports = router;