var express = require('express');
var path = require('path');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var FileStreamRotator = require('file-stream-rotator');
var fs = require('fs');
var conf = require("./config");
var metric = require('metricsclient')
var middlewares = require('service-middlewares')(conf)

//routes
var users = require('./routes/users');
var index = require('./routes/index');

var app = express();

if (conf.get("env") === "production") {
  var logDirectory = __dirname + '/log';
  // ensure log directory exists
  fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
  // create a rotating write stream
  var accessLogStream = FileStreamRotator.getStream({
    date_format: conf.get('log.dateformat'),
    filename: logDirectory + '/access-%DATE%.log',
    frequency: conf.get("log.frequency"),
    verbose: false
  });
  app.use(morgan('combined', {stream: accessLogStream}));
} else {
  app.use(morgan('dev'));
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
//api usage metric
app.use(function (req, res, next) {
  metric.increaseCounter('IdentityService:Usage:' + req.method + ':' + req.url, function (err, jsonObj) {
    if (err != null)
      console.log(err)
    next()
  })
})

// setup routes
app.use('/', index);
app.use('/users', middlewares.auth_middleware, users);

//error handler
//catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('404 Not Found');
  err.status = 404;
  next(err);
});

// development error handler
if (conf.get("env") === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({
      "message": err.message,
      "error": err,
      "errorCode": "INTERNAL_FAILURE"
    });
  });
}

// production error handler
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  metric.errorMetric('IdentityService:Error:' + req.method + ':' + req.url, err, function (error, jsonObj) {
    if (error != null)
      return res.json({
        message: 'Failed to add metric. \n' + err.message,
        "errorCode": "INTERNAL_FAILURE"
      });
    res.json({
      "message": err.message,
      "errorCode": "INTERNAL_FAILURE"
    });
  })
});

module.exports = app;
