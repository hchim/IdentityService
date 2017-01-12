/**
 * Created by huiche on 1/12/17.
 */
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

router.get('/healthy', function (req, res, next) {
    if (mongoose.connection.readyState == 1) {
        res.json({"healthy": true});
    } else {
        res.json({"healthy": false});
    }
});

module.exports = router;