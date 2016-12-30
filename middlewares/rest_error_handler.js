/**
 * This file defines the rest style error handler middleware.
 */
var express = require('express');
var router = express.Router();
var conf = require("../config");
var env = conf.get("env");

//catch 404 and forward to error handler
router.use(function(req, res, next) {
  var err = new Error('404 Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stack trace
if (env === 'development') {
  router.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({
      "message": err.message,
      "error": err,
      "errorCode": "INTERNAL_FAILURE"
    });
  });
}

// production error handler
// no stack traces leaked to user
router.use(function(err, req, res, next) {
  res.status(err.status || 500);
  console.error(err.message);
  res.json({
    "message": err.message,
    "errorCode": "INTERNAL_FAILURE"
  });
});

module.exports = router;

