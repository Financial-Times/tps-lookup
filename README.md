## TPS Screener

**Telephone Preference Service**

The Telephone Preference Service (TPS) is the UK’s only official ‘Do Not Call’ register for landlines and Mobile numbers.
It allows people and businesses to opt out of unsolicited live sales and marketing calls.
If a number is registered with the TPS, organisations are legally required to refrain from calling it.

The TPS Screener application retrieves a list of people who have registered through [TPS](https://www.tpsonline.org.uk/).

Then, an FT service can internally query the TPS Screener to filter the list of people to send marketing comminications to

## Usage

**Setting up/App run**

- Node ^18.x.x
- [Doppler](https://github.com/Financial-Times/ip-ftlive-api#doppler---secrets-management): If new to Doppler, please follow the instruction to install the [CLI](https://docs.doppler.com/docs/install-cli).
```
**To spin up the local instance of the app, run the commands below:**

Replace the start command with "start": "doppler run -p ft-tps-screener -c prod -- node app.js" in package.json.
**_Note: Ensure the start command is reverted to its original state before merge into prod._**
Run `doppler login` command
Run `npm run postinstall ` command
Run `npm run start` command
Enter a UK number in the browser's search bar; if it's registered, it's important to refrain from contacting for sales and marketing purposes.

** Snyk Tests**

Run`npm run test` command
- This will run a `snyk test` as specified in the `scripts` in `package.json`  
- No other testing is configured for now.

**Logging**

Logging for the ```updateNumber.js``` file is sent to Splunk from Heroku. Functions in this file update the numbers stored in ```email-platform-ftcom-tps``` S3 bucket after checking [TPS](https://www.tpsonline.org.uk/) as necessary. ```updateNumber.js``` runs everyday at 11p.m as specified in [Heroku scheduler](https://dashboard.heroku.com/apps/ft-tps-screener/scheduler).  

See the Splunk query below:

```
index="restricted_crm_enablement_fs_prod" source="/var/log/apps/heroku/ft-ft-tps-screener.log"
```

## Heroku Deployments

Any merge to master will trigger a deployment to Heroku
