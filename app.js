var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var conf = require("./config");
var middlewares = require('service-middlewares')(conf)

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

app.use(middlewares.error_404_middleware);
if (conf.get("env") !== 'production') {
    app.use(middlewares.error_500_middleware_dev);
} else {
    app.use(middlewares.error_500_middleware_prod);
}

module.exports = app;
