const { Logger, transforms } = require('@dotcom-reliability-kit/logger');
// Added transform legacyMask to prevent any potential log of PII in the Heroku index. As of June 2024 we do not log any PII (in this case phone numbers). This mask is here to future proof any future added logs from having this information
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


