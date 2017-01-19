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

    describe('GET \'/users/:id\'', function() {
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

        it('should return account information.', function(done) {
            request.get(endpoint + testUser._id, function (err, res, body){
                if (err) done(err);
                var json = JSON.parse(body);
                expect(res.statusCode).to.equal(200);
                expect(json.userId).to.equal(testUser._id.toString());
                done();
            });
        });

        it('should return ACCOUNT_NOT_EXIST error.', function (done) {
            var idNotExist = '5879e28e75ea8145cfe75e83';
            request.get(endpoint + idNotExist, function (err, res, body){
                if (err) done(err);

                var json = JSON.parse(body);
                expect(json.errorCode).to.equal('ACCOUNT_NOT_EXIST');
                done();
            });
        });
    });

    describe('POST \'/:usersid/update-header\'', function() {
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

        it('should upload the header image.', function(done) {
            var formData = {
                image: fs.createReadStream(__dirname + '/test.jpg')
            };

            request.post({url:endpoint + testUser._id + '/' + 'update-header', formData: formData},
                function optionalCallback(err, res, body) {
                if (err) {
                    done(err);
                }

                var json = JSON.parse(body);
                console.log(body);
                expect(res.statusCode).to.equal(200);
                done();
            });
        });
    });
});