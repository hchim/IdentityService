var mongoose = require("mongoose");
var conf = require("../config");

var userSchema = mongoose.Schema({
    email: String,
    passwordHash: String,
    salt: String,
    nickName: String,
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