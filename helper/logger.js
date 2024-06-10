const { Logger, transforms } = require('@dotcom-reliability-kit/logger');
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


