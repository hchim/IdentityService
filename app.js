var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var conf = require("./config");
var metric = require('metricsclient')(conf)
var middlewares = require('service-middlewares')(conf)
var utils = require('servicecommonutils')
var winston = utils.getWinston(conf.get('env'));

//routes
var users = require('./routes/users');
var index = require('./routes/index');
var auth = require('./routes/auth')
var google = require('./routes/google')
var facebook = require('./routes/facebook')
var wechat = require('./routes/wechat')

var app = express();
var logDirectory = __dirname + '/log';
// ensure log directory exists
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/', index);
//request signature checkup
if (conf.get("env") !== 'test') {
  app.use(middlewares.signature_middleware)
}
// setup routes
app.use('/', auth);
app.use('/google', google)
app.use('/facebook', facebook)
app.use(('/wechat', wechat))
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
        return res.json(utils.encodeResponseBody(req, {
            "message": err.message,
            "error": err,
            "errorCode": "INTERNAL_FAILURE"
        }));
    });
}

// production error handler
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    winston.log('error', err.message, err);
    metric.errorMetric('IdentityService:Error:' + req.method + ':' + req.url, err, function (error, jsonObj) {
        if (error != null)
            return res.json(utils.encodeResponseBody(req, {
                message: 'Failed to add metric. \n' + err.message,
                "errorCode": "INTERNAL_FAILURE"
            }));
        return res.json(utils.encodeResponseBody(req, {
            "message": err.message,
            "errorCode": "INTERNAL_FAILURE"
        }));
    })
});

module.exports = app;
