var convict = require('convict');
var fs = require('fs');
var utils = require('servicecommonutils')
// Define a schema
var conf = convict(utils.commonConfigs());
conf.loadFile('./config/common.json')
// Load environment dependent configuration
var config_path = './config/' + conf.get('env');
var files = fs.readdirSync(config_path);

files.forEach(function (file) {
    var path = config_path + "/" + file;
    conf.loadFile(path);
});

// Perform validation
conf.validate({allowed: 'strict'});

module.exports = conf;