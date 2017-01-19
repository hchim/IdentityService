var convict = require('convict');
var fs = require('fs');

// Define a schema
var conf = convict({
    env: {
        doc: "The applicaton environment.",
        format: ["production", "development", "test"],
        default: "development",
        env: "NODE_ENV"
    },
    server: {
        ip: {
            doc: "IP address to bind",
            format: 'ipaddress',
            default: '0.0.0.0',
            env: "IP"
        },
        port: {
            doc: "port to bind",
            format: 'port',
            default: 3011,
            env: "PORT"
        }
    },
    log: {
        dateformat: {
            doc: "date format",
            default: 'YYYY-MM-DD'
        },
        frequency: {
            doc: 'the log file rotate frequency',
            default: "daily"
        }
    },
    db: {
        mongodb: {
            url: {
                doc: "mongodb url",
                "default": "mongodb://localhost/identitydb"
            }
        }
    },
    upload_dir: {
        doc: 'Upload cache file directory',
        default: 'cache_files/'
    },
    aws: {
        s3: {
            header: {
                bucket: "sleeprecord-header",
                accessKeyId: "AKIAJUG7F5Z3ZLM45HLA",
                secretAccessKey: "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"
            }
        }
    }

});

// Load environment dependent configuration
var config_path = './config/' + conf.get('env');
var files = fs.readdirSync(config_path);

files.forEach(function (file) {
    var path = config_path + "/" + file;
    conf.loadFile(path);
});

// Perform validation
conf.validate({strict: true});

module.exports = conf;