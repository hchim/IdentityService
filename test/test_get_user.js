var assert = require('assert');
var User = require('../models/User');
var mongoose = require('mongoose');
var conf = require("../config");
var bcrypt = require('bcrypt');
var request = require('request');
var expect = require('Chai').expect;
var fs = require('fs');
var commonUtils = require('servicecommonutils')

var port = conf.get('server.port');
var ip = conf.get("server.ip");
var dbUrl = conf.get('db.mongodb.url');
var endpoint = 'http://' + ip + ':' + port + '/users/';
var login_endpoint = 'http://' + ip + ':' + port + '/login';

var saltRounds = 10;
var password = 'password';
var salt = bcrypt.genSaltSync(saltRounds);
var hash = bcrypt.hashSync(password, salt);

var testUser = new User({
    "email" : "test-get@example.com",
    "nickName" : 'TestUser',
    "headerImageUrl": null,
    "salt": salt,
    "passwordHash": hash,
});

describe('/users', function() {

    before(function (done) {
        mongoose.connect(dbUrl, function (err) {
            if (err) {
                return done(err);
            }
            console.log("Connected to mongodb: " + dbUrl);
            mongoose.set('debug', true);
            done();
        });
    });

    after(function (done) {
        mongoose.disconnect();
        done();
    });

    describe('GET \'/users\'', function () {
        before(function (done) {
            User.remove({}, function () {
                testUser.save(function (err) {
                    if (err) return done(err);
                    done();
                });
            });
        });

        after(function (done) {
            testUser.remove(function (err) {
                if (err) return done(err);
                done();
            });
        });

        it('should return account information.', function (done) {
            var formData = {
                email: testUser.email,
                password: password
            };

            request.post({
                url: login_endpoint, form: formData,
                headers: {
                    'is-internal-request': 'YES'
                }
            }, function (err, res, body) {
                if (err) done(err);

                var json = JSON.parse(body);
                console.log(body)
                expect(res.statusCode).to.equal(200);

                request.get({
                    url: endpoint,
                    headers: {
                        'x-auth-token': json.accessToken,
                        'is-internal-request': 'YES'
                    }
                }, function (err, res, body) {
                    if (err) done(err);
                    var json = JSON.parse(body);
                    expect(res.statusCode).to.equal(200);
                    expect(json.userId).to.equal(testUser._id.toString());
                    done();
                });
            })
        });
    });
})
