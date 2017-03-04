var mongoose = require("mongoose");
var conf = require("../config");
const validator = require('validator');

var userSchema = mongoose.Schema({
    email: {
        type: String,
        required: true,
        validate: [validator.isEmail, 'Invalid email'],
    },
    passwordHash: String,
    salt: String,
    nickName: {
        type: String,
        required: true,
        maxlength: 20,
        minlength: 5
    },
    headerImageUrl: String,
    emailVerified: { type: Boolean, default: false},
    createTime: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
    verifyCode: String,
    securityCode: String
});

// indexes

userSchema.index({ _id: 1});
userSchema.index({ email: 1});

if (conf.get("env") === 'production') {
    userSchema.set('autoIndex', false);
} else {
    userSchema.set('autoIndex', true);
}

// methods

var User = mongoose.model('User', userSchema);

module.exports = User;