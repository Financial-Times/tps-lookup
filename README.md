## TPS Screener

**Telephone Preference Service**

The Telephone Preference Service (TPS) serves as the UK's sole official 'Do Not Call' register for both landlines and mobile numbers. It empowers individuals and businesses to opt out of receiving unsolicited live sales and marketing calls. Once a number is registered with the TPS, organisations are obligated by law to abstain from making calls to it.

The TPS Screener application retrieves a compilation of individuals who have completed registration through the [TPS](https://www.tpsonline.org.uk/).

Subsequently, an FT service can leverage the TPS Screener to intelligently refine the list of recipients, ensuring that marketing communications are directed only to the appropriate individuals.

## Usage

### Setting up/App run

- Node ^22.x.x
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

## Where and How tps-lookup Runs
`ft-tps-screener` is hosted in AWS ECS via Hako.

### Where to find it
Production environment:
AWS Console – ECS Prod Cluster (`crm-prod-eu-west-1`) 
Look for the `ft-tps-screener` service

Review environment:
AWS Console – ECS Review Cluster (`crm-review-eu-west-1`)

Scheduled task configuration (EventBridge):
AWS Console – EventBridge Schedules
Filter for the app name to view or confirm scheduled job times.

### Scheduled Task Timing
`ft-tps-screener` runs on a an EventBridge Scheduler configured via the app.yaml under the [scheduled-task stack](https://github.com/Financial-Times/tps-lookup/blob/818770c095b92494966cd58a331821168d9145de/hako-config/apps/ft-tps-screener/crm-prod-eu-west-1/app.yaml#L40-L50) using the TaskSchedule parameter.

Example:
```yaml
scheduled-task:
  type: scheduled-task
  parameters:
    TaskSchedule: "daily at 23:00"
```
  
Times are always specified in UTC, so for UK times, adjust accordingly (e.g. 20:00 UTC = 9:00 PM UK during BST).

How to change the schedule:  
1. Pull the repo and open your `app.yaml` for the relevant environment:

`hako-config/apps/ft-tps-screener/crm-prod-eu-west-1/app.yaml`  

2. Update the TaskSchedule line under the scheduled-task stack.

3. Re-deploy the app via hako:  
- Follow steps 1 and 2 from the [Login and Deploy](https://financialtimes.atlassian.net/wiki/spaces/SF/pages/9086500865/CRM+Guide+Heroku+to+AWS+Migration+using+Hako#%3Aaws%3A---Login-%26-Deploy) section in the CRM Migration guide.
Note: This deploy uses the default Hako image.

4. If you're making the change via a PR or draft PR, this will also automatically deploy to the review environment, so you can validate the change before merging to main.

5. Once validated, merge to master to apply the schedule update in production.

6. Confirm the new schedule in the AWS EventBridge Console - `Amazon EventBridge/Schedules`


For more detail on hako:  
- See the [CRM Hako Migration Guide](https://financialtimes.atlassian.net/wiki/spaces/SF/pages/9086500865/CRM+Guide+Heroku+to+AWS+Migration+using+Hako)
- Refer to the [Hako Wiki](https://github.com/Financial-Times/hako-cli/wiki)

## Development
When you push your branch to the remote repo and a PR is opened (including draft PR), if CircleCI checks are successful, `ft-tps-screener` is deployed to the AWS crm-review-eu-west-1 environment. We are not appending the PR number to the app name as with other configs due to a character limit when using Scheduled Task stacks:  

`Properties validation failed for TaskEventBridgeScheduler with message: [#/Name:expected maxLength: 64, actual: 68]`             

Once this is resolved/we have a workaround, we’ll use PR numbers in the app name.

### Logging

Logging for the `updateNumber.js` file is sent to Splunk from AWS. Functions in this file update the numbers stored in the `email-platform-ftcom-tps` S3 bucket after checking [TPS](https://www.tpsonline.org.uk/) as necessary. Updates to numbers found are written to the `ft-email_platform_tps_lookup` DynamoDB table.

`updateNumber.js` runs everyday at 11pm as specified in the [Heroku scheduler](https://dashboard.heroku.com/apps/ft-tps-screener/scheduler).

See the Splunk query below:

`index=hako source="ft-tps-screener" host="ft-tps-screener.eu-west-1.crm-prod.ftweb.tech"`

View errors using this search query

`index="hako" source="ft-tps-screener" host="ft-tps-screener.eu-west-1.crm-prod.ftweb.tech" level="error"`

There is currently no alerting for this app.

## Change API

This system uses Change API to log changes to this app. A deployment will trigger a Change API alert in the #CRM Alerts Slack channel

## Heroku Deployments

Any merge to master will trigger a deployment to Heroku.
