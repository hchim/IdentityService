var assert = require('assert');
var conf = require("../config");
var request = require('request');
var expect = require('Chai').expect;
var commonUtils = require('servicecommonutils');

describe('send email', function () {
    it('should successfully send email', function (done) {
        var ses = commonUtils.createSESClient(conf);
        var to = "hchen229@gmail.com";
        var subject = "Sleepaiden test email"
        var body = "Test email from sleepaiden.com"

        commonUtils.sendEmail(ses, conf.get('email.from_email'), to, subject, body, function (err, data) {
                expect(err).to.be.null;
                console.log(data);
                done()
        });
    })
})