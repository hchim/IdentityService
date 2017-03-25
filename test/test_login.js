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

var port = conf.get('server.port');
var ip = conf.get("server.ip");
var dbUrl = conf.get('mongodb.url');
var endpoint = 'http://' + ip + ':' + port + '/';

var saltRounds = 10;
var password = 'password';
var salt = bcrypt.genSaltSync(saltRounds);
var hash = bcrypt.hashSync(password, salt);

describe('/', function() {

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

    describe('POST \'/login\'', function() {
        var testUser = new User({
            "email" : "hchen229@gmail.com",
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

        it('should return login information.', function(done) {
            var formData = {
                email: testUser.email,
                password: password
            };

            request.post({
                url: endpoint + 'login', form: formData,
                headers: {
                    'is-internal-request': 'YES'
                }
            }, function (err, res, body){
                if (err) done(err);

                var json = JSON.parse(body);
                expect(res.statusCode).to.equal(200);
                expect(json.userId).to.equal(testUser._id.toString());
                done();
            });
        });

        it('should return WRONG_PASSWORD error.', function(done) {
            var formData = {
                email: testUser.email,
                password: 'wrong_password'
            };

            request.post({
                url: endpoint + 'login', form: formData,
                headers: {
                    'is-internal-request': 'YES'
                }
            }, function (err, res, body){
                if (err) done(err);

                var json = JSON.parse(body);
                expect(res.statusCode).to.equal(200);
                expect(json.errorCode).to.equal('WRONG_PASSWORD');
                done();
            });
        });

        it('should return ACCOUNT_NOT_EXIST error.', function(done) {
            var formData = {
                email: 'notexistemail@example.com',
                password: 'wrong_password'
            };

            request.post({
                url: endpoint + 'login', form: formData,
                headers: {
                    'is-internal-request': 'YES'
                }
            }, function (err, res, body){
                if (err) done(err);

                var json = JSON.parse(body);
                expect(res.statusCode).to.equal(200);
                expect(json.errorCode).to.equal('ACCOUNT_NOT_EXIST');
                done();
            });
        });
    });
});