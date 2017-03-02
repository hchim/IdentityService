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

    describe('POST \'/verify-email\'', function() {
        before(function(done) {
            User.remove({}, function () {
                done()
            });
        });

        it('should return successfully.', function(done) {
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
                User.findOne({'_id': json.userId}, function (err, user) {
                    if (err) done(err);
                    var form2 = {
                        verifyCode: user.verifyCode
                    };

                    request.post({
                        url: endpoint + 'users/verify-email',
                        form: form2,
                        headers: {
                            'x-auth-token': json.accessToken,
                            'is-internal-request': 'YES'
                        }
                    }, function (err, res, body) {
                        if (err) done(err)
                        console.log(body)
                        var json2 = JSON.parse(body);
                        expect(res.statusCode).to.equal(200);
                        expect(json2.userId).to.equal(user._id.toString());
                        done()
                    });
                });
            });
        });

        it('should return wrong WRONG_VERIFY_CODE.', function(done) {
            var formData = {
                email: "test-112@example.com",
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
                User.findOne({'_id': json.userId}, function (err, user) {
                    if (err) done(err);
                    var form2 = {
                        verifyCode: 'wrongCode'
                    };

                    request.post({
                        url: endpoint + 'users/verify-email',
                        form: form2,
                        headers: {
                            'x-auth-token': json.accessToken,
                            'is-internal-request': 'YES'
                        }
                    }, function (err, res, body) {
                        if (err) done(err)
                        var json2 = JSON.parse(body);
                        expect(res.statusCode).to.equal(200);
                        expect(json2.errorCode).to.equal('WRONG_VERIFY_CODE');
                        done()
                    });
                });
            });
        });
    });
})