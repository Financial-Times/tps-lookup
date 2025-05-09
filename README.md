## TPS Screener

**Telephone Preference Service**

The Telephone Preference Service (TPS) serves as the UK's sole official 'Do Not Call' register for both landlines and mobile numbers. It empowers individuals and businesses to opt out of receiving unsolicited live sales and marketing calls. Once a number is registered with the TPS, organisations are obligated by law to abstain from making calls to it.

The TPS Screener application retrieves a compilation of individuals who have completed registration through the [TPS](https://www.tpsonline.org.uk/).

Subsequently, an FT service can leverage the TPS Screener to intelligently refine the list of recipients, ensuring that marketing communications are directed only to the appropriate individuals.

## Usage

### Setting up/App run

- Node ^20.x.x
- [Doppler CLI](https://docs.doppler.com/docs/install-cli) if new to Doppler click to install the CLI.

### Run the app locally

**To spin up the local instance of the production app, run the commands below:**

- Replace the start command with `"start:prod-from-local": "doppler run -p ft-tps-screener -c prod -- node app.js"` in package.json.
- **_Note: Ensure the start command is reverted to its original state before merge into prod._**

- Run `doppler login` command
- Run `npm run postinstall` command
- Run `npm run start` command

Enter a UK number in the browser's search bar; if it's registered, it's important to refrain from contacting for sales and marketing purposes.

### Testing

There is currently no staging environment to test this app.

### Logging

Logging for the `updateNumber.js` file is sent to Splunk from Heroku. Functions in this file update the numbers stored in the `email-platform-ftcom-tps` S3 bucket after checking [TPS](https://www.tpsonline.org.uk/) as necessary. Updates to numbers found are written to the `ft-email_platform_tps_lookup` DynamoDB table.

`updateNumber.js` runs everyday at 11pm as specified in the [Heroku scheduler](https://dashboard.heroku.com/apps/ft-tps-screener/scheduler).

See the Splunk query below:

`index=heroku source="ft-tps-screener" host="ft-tps-screener.herokuapp.com"`

View errors using this search query

`index=heroku source="ft-tps-screener" host="ft-tps-screener.herokuapp.com" level="error"`

There is currently no alerting for this app.

## Change API

This system uses Change API to log changes to this app. A deployment will trigger a Change API alert in the #CRM Alerts Slack channel

## Heroku Deployments

Any merge to master will trigger a deployment to Heroku.
