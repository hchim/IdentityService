var mongoose = require("mongoose");
var conf = require("../config");

var userSchema = mongoose.Schema({
    userId: String,
    email: String,
    password: String,
    nickName: String,
});

// indexes

userSchema.index({ userId: 1});
userSchema.index({ email: 1});

if (conf.get("env") === 'production') {
    userSchema.set('autoIndex', false);
} else {
    userSchema.set('autoIndex', true);
}

// methods

/*
 Find the sleep records of the user in the time range [from, to].
 */
userSchema.statics.findByEmail = function (email, callback) {
    this.find({
        email: email
    })
        .sort({ fallAsleepTime: -1 })
        .select({ fallAsleepTime: 1, wakeupTime: 1 })
        .exec(callback);
}

var User = mongoose.model('User', userSchema);

module.exports = User;