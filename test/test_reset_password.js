var User = require('../models/User');
var mongoose = require('mongoose');
var conf = require("../config");
var request = require('request');
var expect = require('Chai').expect;

var port = conf.get('server.port');
var ip = conf.get("server.ip");
var dbUrl = conf.get('mongodb.url');
var endpoint = 'http://' + ip + ':' + port + '/';

describe('/reset-pswd', function() {
    before(function(done) {
        mongoose.connect(dbUrl, function (err) {
            if (err) {
                return done(err);
            }
            console.log("Connected to mongodb: " + dbUrl);
            mongoose.set('debug', true);
            User.remove({}, function (err) {
                if (err) done(err);
                done();
            });
        });
    });

    after(function(done) {
        mongoose.disconnect();
        done();
    });

    it('should successfully reset password.', function(done) {
        var email = 'test@example.com';
        var nickName = 'TestUser';
        var password = 'password';
        var userId;
        //Register an account
        request.post({
            url: endpoint + 'register',
            form: {
                email: email,
                nickName: nickName,
                password: password
            },
            headers: {
                'is-internal-request': 'YES'
            }
        }, function (err, res, body){
            if (err) done(err);

            var json = JSON.parse(body);
            console.log(json);
            expect(res.statusCode).to.equal(200);
            userId = json.userId;
            expect(json.nickName).to.equal(nickName);

            //generate a security code and send a reset password email
            request.post({
                url: endpoint + 'reset-email',
                form: {
                    email: email
                },
                headers: {
                    'is-internal-request': 'YES'
                }
            }, function (err, res, body) {
                if (err) done(err);

                var json = JSON.parse(body);
                expect(res.statusCode).to.equal(200);
                expect(json.userId).to.equal(userId);

                //Find the user account and get the correct security code
                User.findOne({'_id': userId}, function (err, user) {
                    if (err) done(err);
                    // send the reset password request
                    request.post({
                        url: endpoint + 'reset-pswd',
                        form: {
                            email: email,
                            securityCode: user.securityCode,
                            newPassword: 'newPassword'
                        },
                        headers: {
                            'is-internal-request': 'YES'
                        }
                    }, function (err, res, body) {
                        var json2 = JSON.parse(body);
                        expect(res.statusCode).to.equal(200);
                        expect(json2.userId).to.equal(userId);
                        done();
                    });
                });
            });
        });
    });

    it('should return WRONG_SECURITY_CODE.', function(done) {
        var email = 'test2@example.com';
        var nickName = 'TestUser';
        var password = 'password';
        var userId;
        //Register an account
        request.post({
            url: endpoint + 'register',
            form: {
                email: email,
                nickName: nickName,
                password: password
            },
            headers: {
                'is-internal-request': 'YES'
            }
        }, function (err, res, body){
            if (err) done(err);

            var json = JSON.parse(body);
            console.log(json);
            expect(res.statusCode).to.equal(200);
            userId = json.userId;
            expect(json.nickName).to.equal(nickName);

            //generate a security code and send a reset password email
            request.post({
                url: endpoint + 'reset-pswd',
                form: {
                    email: email,
                    securityCode: 'wrongCode',
                    newPassword: 'newPassword'
                },
                headers: {
                    'is-internal-request': 'YES'
                }
            }, function (err, res, body) {
                if (err) done(err);

                var json = JSON.parse(body);
                console.log(body);
                expect(res.statusCode).to.equal(200);
                expect(json.errorCode).to.equal('WRONG_SECURITY_CODE');
                done();
            });
        });
    });
});