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
    base_url: {
        doc: "The base url of this service.",
        default: "http://identityservice.hch.im/"
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
        },
        ses: {
            accessKeyId: "AKIAJUG7F5Z3ZLM45HLA",
            secretAccessKey: "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"
        }
    },
    email: {
        from_email: 'hui@hch.im',
    },
    email_template: {
        register: {
            subject: 'Welcome to SleepRecord',
            html: 'Hi %s,<br>' +
            'Welcome to use SleepRecord.<br>' +
            'Please input the code to verify your email: %s<br>' +
            'Thanks<br>' +
            'The SleepRecord Team'
        },
        reset_email: {
            subject: 'Reset your password',
            html: 'Hi %s,<br>' +
            'Please input this security code to reset your password: %s<br>' +
            'Thanks<br>' +
            'The SleepRecord Team'
        }
    },
    redis: {
        host: '127.0.0.1',
        port: 6379
    },
    google: {
        client_id: '650072071981-l2jj7dl5vusk55k1uii7kj69ush9f9hd.apps.googleusercontent.com'
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