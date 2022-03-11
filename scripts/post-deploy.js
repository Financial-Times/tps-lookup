const fetch = require('node-fetch');
console.log("Checking");
fetch(`https://api.heroku.com/apps/${process.env.HEROKU_APP_NAME}/config-vars`,{ 
	method: 'PATCH',
	headers: {
		'Content-Type': 'application/json',
		'Accept': 'application/vnd.heroku+json; version=3',
		'Authorization': `Bearer ${process.env.HEROKU_TOKEN}`,
	},
	body: JSON.stringify({
		AUTH_APP_BASE_URL: `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`
	})
});

fetch('https://8ecxisot9c.execute-api.eu-west-1.amazonaws.com/production', {
	method: 'POST', 
	body: JSON.stringify({
		clientId: process.env.OKTA_CLIENT_ID,
		method: 'deploy',
		systemCode: 'ft-tps-screener',
		url: `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`
	})
});
