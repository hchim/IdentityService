/**
 * Created by huiche on 1/13/17.
 */
var assert = require('assert');
var User = require('../models/User');
var mongoose = require('mongoose');
var conf = require("../config");
var bcrypt = require('bcrypt');
var request = require('request');
var expect = require('Chai').expect;
var fs = require('fs');

var port = conf.get('server.port');
var ip = conf.get("server.ip");
var dbUrl = conf.get('db.mongodb.url');
var endpoint = 'http://' + ip + ':' + port + '/users/';
var login_endpoint = 'http://' + ip + ':' + port + '/login/';

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

    before(function(done) {
        mongoose.connect(dbUrl, function (err) {
            if (err) {
                return done(err);
            }
            console.log("Connected to mongodb: " + dbUrl);
            mongoose.set('debug', true);
            done();
        });
    });

    after(function(done) {
        mongoose.disconnect();
        done();
    });

    describe('PUT \'/update-name\'', function() {
        var testUser = new User({
            "email" : "test-get@example.com",
            "nickName" : 'TestUser',
            "headerImageUrl": null,
            "salt": salt,
            "passwordHash": hash,
        });

        before(function(done) {
            User.remove({}, function () {
                testUser.save(function (err) {
                    if (err) return done(err);
                    done();
                });
            });
        });

        after(function(done) {
            testUser.remove(function (err) {
                if (err) return done(err);
                done();
            });
        });

        it('should successfully update user name.', function(done) {
            var formData = {nickName: 'NewNickName'};
            var loginformData = {
                email: testUser.email,
                password: password
            };

            request.post({url: login_endpoint, form: loginformData}, function (err, res, body) {
                if (err) done(err);

                var json = JSON.parse(body);
                expect(res.statusCode).to.equal(200);

                request.put({
                    url: endpoint + 'update-name', form: formData,
                    headers: {
                        'x-auth-token': json.accessToken
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
});
