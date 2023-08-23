## TPS Screener

**Telephone Preference Service**

The Telephone Preference Service (TPS) is the UK’s only official ‘Do Not Call’ register for landlines and Mobile numbers.
It allows people and businesses to opt out of unsolicited live sales and marketing calls.
If a number is registered with the TPS, organisations are legally required to refrain from calling it.

The TPS Screener application retrieves a list of people who have registered through [TPS](https://www.tpsonline.org.uk/).

Then, an FT service can internally query the TPS Screener to filter the list of people to send marketing comminications to

## Usage

**Setting up**

1. Navigate to the project where you have cloned this to the machine.
Run this command to install the packages needed for the app locally ( if it is the first time running this project locally)

```shell
npm run postinstall
```

2. If you haven't already, set up your Vault environment variables using this guide [Vault Wiki](https://github.com/Financial-Times/vault/wiki/Getting-Started-With-Vault), and log into the Internal Products' Vault with `vault login --method=github`. 

3. Run the following command to populate your `.env` file:

```shell
npm run vault:env
```

4. To spin up the local instance of the app, run the command below:

```shell
npm start
```

**Tests**

Run the command `npm run test` for tests.  
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
