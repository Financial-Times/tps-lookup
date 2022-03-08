const fetch = require('node-fetch');
fetch('https://8ecxisot9c.execute-api.eu-west-1.amazonaws.com/production', {
    method: 'POST', 
    body: JSON.stringify({
        clientId: process.env.OKTA_CLIENT_ID,
        method: 'destroy',
        systemCode: 'ft-tps-screener',
        url: `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`
    })
});
