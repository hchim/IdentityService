var express = require('express');
var router = express.Router();
var User = require("../models/User");
var multer  = require('multer')
var conf = require("../config");
var AWS = require('aws-sdk');
var fs = require('fs');
var bcrypt = require('bcrypt');

const saltRounds = 10;

//setup access key for uploading header image
AWS.config = new AWS.Config();
AWS.config.accessKeyId = conf.get('aws.s3.header.accessKeyId');
AWS.config.secretAccessKey = conf.get('aws.s3.header.secretAccessKey');

router.get('/:id', function (req, res, next) {
  var id = req.params.id;

  User.findOne({ '_id': id }, function (err, user) {
    if (err) {
      return next(err);
    }

    if (user == null) {
      res.json({
        "message": "User account does not exist.",
        "errorCode": "ACCOUNT_NOT_EXIST"
      });
    } else {
      res.json({
        "userId": user._id,
        "nickName": user.nickName,
        "headerImageUrl": user.headerImageUrl,
        "emailVerified": user.emailVerified,
        "createTime": user.createTime,
      });
    }
  });
});

router.post('/users/:id/verify-email', function (req, res, next) {
  var id = req.params.id;

  User.findOne({ '_id': id }, function (err, user) {
    if (err) {
      return next(err);
    }

    if (user == null) {
      res.json({
        "message": "User account does not exist.",
        "errorCode": "ACCOUNT_NOT_EXIST"
      });
    } else {
      if (req.body.revifyCode == user.verifyCode) {
        user.emailVerified = true;
        user.save(function (err) {
          if (err) return next(err);
          res.json({
            "userId": user._id,
          });
        });
      } else {
        res.json({
          "message": "Wrong verification code..",
          "errorCode": "WRONG_VERIFY_CODE"
        });
      }
    }
  });
});

var upload = multer({ dest: conf.get('upload_dir')});

router.post('/:id/update-header', upload.single('image'), function(req, res, next) {
  var s3 = new AWS.S3();
  var fileBuffer = fs.readFileSync(req.file.path);

  var params = {
    ACL: 'public-read', Bucket: conf.get('aws.s3.header.bucket'),
    Body: fileBuffer, ContentType: 'image/jpg',
    Key: req.file.filename + '.jpg'
  };

  s3.upload(params, function(err, data) {
    if (err) {
      return next(err);
    }

    User.findOne({ '_id': req.params.id }, function (err, user) {
      if (err) return next(err);

      if (user != null) {
        user.headerImageUrl = data.Location;
        user.save();
      }
      res.json({"headerImageUrl": data.Location});
    });
  });
});

router.put('/:id/update-name', function (req, res, next) {
  var id = req.params.id;

  User.findOne({ '_id': id }, function (err, user) {
    if (err) {
      return next(err);
    }

    if (user == null) {
      res.json({
        "message": "User account does not exist.",
        "errorCode": "ACCOUNT_NOT_EXIST"
      });
    } else {
      user.nickName = req.body.nickName;
      user.save(function (err) {
        if (err) return next(err);
        res.json({
          "userId": user._id,
          "nickName": user.nickName,
        });
      });
    }
  });
});

router.put('/:id/update-pswd', function (req, res, next) {
  var id = req.params.id;

  User.findOne({ '_id': req.params.id }, function (err, user) {
    if (err) {
      return next(err);
    }

    if (user == null) {
      return res.json({
        "message": "User account does not exist.",
        "errorCode": "ACCOUNT_NOT_EXIST"
      });
    }

    if (!bcrypt.compareSync(req.body.oldPassword, user.passwordHash)) {
      return res.json({
        "message": "Wrong password.",
        "errorCode": "WRONG_PASSWORD"
      });
    }

    user.salt = bcrypt.genSaltSync(saltRounds);
    user.passwordHash = bcrypt.hashSync(req.body.newPassword, user.salt);
    user.save(function (err) {
      if (err) return next(err);
      //TODO generate access token
      res.json({
        "userId": user._id,
      });
    });
  });
});

module.exports = router;