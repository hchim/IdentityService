var express = require('express');
var router = express.Router();
var User = require("../models/User");
var bcrypt = require('bcrypt');

const saltRounds = 10;

router.get('/home', function (req, res, next) {
  res.send("home");
});

/*
  Register a user account.
*/
router.post('/register', function(req, res, next) {
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

    res.json({"userId": user._id});
  });

});

module.exports = router;
