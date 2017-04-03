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
        maxlength: 20
    },
    headerImageUrl: String,
    emailVerified: { type: Boolean, default: false},
    createTime: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
    verifyCode: String,
    securityCode: String,
    openidProvider: String, //Google, Facebook, Wechat
    wechat_meta: {
        openid: String,
        accessToken: String,
        refreshToken: String
    },
    google_meta: {
        idToken: String
    }
});

/**
 * Get the active user. If user not exist, create it.
 * @param user
 * @param callback
 */
userSchema.statics.getOrCreate = function(user, callback) {
    this.findOne({ 'email': user.email, 'active': true}, function (err, obj) {
        if (err) {
            return callback(err, null);
        }

        if (obj) {
            return callback(null, obj);
        } else {
            user.save(function (err, user) {
                if (err) {
                    return callback(err, null);
                }
                return callback(null, user);
            })
        }
    });
};

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