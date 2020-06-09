## TPS Screener

**Telephone Preference Service**

The Telephone Preference Service (TPS) is the UK’s only official ‘Do Not Call’ register for landlines and Mobile numbers.
It allows people and businesses to opt out of unsolicited live sales and marketing calls.
If a number is registered with the TPS, organisations are legally required to refrain from calling it.

The TPS Screener application retrieves a list of people who have registered through [TPS](https://www.tpsonline.org.uk/).

Then, an FT service can internally query the TPS Screener to filter the list of people to send marketing comminications to

## Usage

**Setting up**

Firstly, navigate to the project where you have cloned this to the machine.
Run this command to install the packages needed for the app locally ( if it is the first time running this project locally )

```shell
npm run postinstall
```

Then, to spin up the local instance of the app, run the command below:

```shell
npm start
```

## Heroku Deployments

Any merge to master will trigger a deployment to Heroku