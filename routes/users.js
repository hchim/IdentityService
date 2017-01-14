var express = require('express');
var router = express.Router();
var User = require("../models/User");

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

module.exports = router;
