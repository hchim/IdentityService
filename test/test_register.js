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
            done();
        });
    });

    after(function (done) {
        mongoose.disconnect();
        done();
    });

    describe('POST \'/register\'', function() {
        var testUser = new User({
            "email" : "test-postregister@example.com",
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

        it('should return registered information.', function(done) {
            var formData = {
                email: "test-111@example.com",
                nickName: 'TestUser2',
                password: password
            };

            request.post({
                url: endpoint + 'register', form: formData,
                headers: {
                    'is-internal-request': 'YES'
                }
            }, function (err, res, body){
                if (err) done(err);

                var json = JSON.parse(body);
                expect(res.statusCode).to.equal(200);
                expect(json.nickName).to.equal(formData.nickName);
                // clear user
                User.remove({'_id': json.userId}, function (err) {
                    if (err) done(err);
                    done();
                });
            });
        });

        it('should return EMAIL_USED error.', function(done) {
            var formData = {
                email: testUser.email,
                nickName: 'TestUser2',
                password: password
            };

            request.post({
                url: endpoint + 'register', form: formData,
                headers: {
                    'is-internal-request': 'YES'
                }
            }, function (err, res, body){
                if (err) done(err);

                var json = JSON.parse(body);

                expect(res.statusCode).to.equal(200);
                expect(json.errorCode).to.equal('EMAIL_USED');
                done();
            });
        });

        it('invalid email error.', function(done) {
            var formData = {
                email: 'wrongemail',
                nickName: 'TestUser2',
                password: password
            };

            request.post({
                url: endpoint + 'register', form: formData,
                headers: {
                    'is-internal-request': 'YES'
                }
            }, function (err, res, body){
                if (err) done(err);

                var json = JSON.parse(body);
                expect(res.statusCode).to.equal(500);
                done();
            });
        });
    });
})