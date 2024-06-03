const { Logger, transforms } = require('@dotcom-reliability-kit/logger');
// Added transform legacyMask to prevent any potential log of PII in the Heroku index.
const logger = new Logger({
    withPrettifier: false,
	logLevel: 'info',
    transforms:[
        transforms.legacyMask({
            denyList: [ 'phone' ]
        })
    ]

});

module.exports = logger;


