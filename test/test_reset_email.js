/**
 * Created by huiche on 1/28/17.
 */
var assert = require('assert');
var User = require('../models/User');
var mongoose = require('mongoose');
var conf = require("../config");
var bcrypt = require('bcrypt');
var request = require('request');
var expect = require('Chai').expect;

var port = conf.get('server.port');
var ip = conf.get("server.ip");
var dbUrl = conf.get('db.mongodb.url');
var endpoint = 'http://' + ip + ':' + port + '/';

var saltRounds = 10;
var password = 'password';
var salt = bcrypt.genSaltSync(saltRounds);
var hash = bcrypt.hashSync(password, salt);

describe('/', function() {

    before(function (done) {
        mongoose.connect(dbUrl, function (err) {
            if (err) {
                return done(err);
            }
            console.log("Connected to mongodb: " + dbUrl);
            mongoose.set('debug', true);
            User.remove({}, function () {
                done();
            });
        });
    });

    after(function (done) {
        mongoose.disconnect();
        done();
    });

    describe('POST \'/reset-email\'', function() {
        var userId;

        before(function (done) {
            var formData = {
                email: "test-115@example.com",
                nickName: 'TestUser2',
                password: password
            };

            request.post({url: endpoint + 'register', form: formData}, function (err, res, body) {
                if (err) done(err);

                var json = JSON.parse(body);
                userId = json.userId;
                done()
            })
        })

        it('should return send reset email.', function(done) {
            // clear user
            User.findOne({'_id': userId}, function (err, user) {
                if (err) done(err);
                var form2 = {
                    email: user.email
                };

                request.post({url: endpoint + 'reset-email', form: form2}, function (err, res, body) {
                    var json = JSON.parse(body);
                    expect(res.statusCode).to.equal(200);
                    expect(json.userId).to.equal(userId);
                    done();
                });
            });
        });
    });
})