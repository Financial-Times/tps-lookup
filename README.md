## TPS Screener

**Telephone Preference Service**

The Telephone Preference Service (TPS) serves as the UK's sole official 'Do Not Call' register for both landlines and mobile numbers.
It empowers individuals and businesses to opt out of receiving unsolicited live sales and marketing calls. Once a number is registered with the TPS, organisations are obligated by law to abstain from making calls to it.

The TPS Screener application retrieves a compilation of individuals who have completed registration through the [TPS](https://www.tpsonline.org.uk/) and [CPTS](https://corporate.ctpsonline.org.uk/)

Subsequently, an FT service can leverage the TPS Screener to intelligently refine the list of recipients, ensuring that marketing communications are directed only to the appropriate individuals.
## Architecture
- **UI & API:** Express serves a static bundle at `/` and a JSON endpoint at `/search`.
- **Data pipeline:** `scripts/update-numbers.js` downloads the latest TPS/CTPS files from the TPS SFTP, diffs them against our S3 snapshot (`email-platform-ftcom-tps`), and applies additions or deletions to DynamoDB.
- **Storage:** Production data lives in DynamoDB table `ft-email_platform_tps_lookup` (CRM prod account). A test/exploration table, `test-table`, is in the FT Tech IP Martech Prod account (`arn:aws:dynamodb:eu-west-1:307164329441:table/test-table`).
- **Auth:** Okta (OIDC) protects the UI and API; internal services can supply an API key header instead.
- **Hosting:** App runs in AWS ECS via Hako. CI deploys review builds to `crm-review-eu-west-1`; merges to `master` go to `crm-prod-eu-west-1`.

## Configuration & Data
- **DynamoDB (prod):** `ft-email_platform_tps_lookup` in account `FT Tech Infrastructure Prod (027104099916)`. Each item stores the phone number (primary key) plus `lastRetrieved`, which we update when a number is queried.
- **DynamoDB (test):** `test-table` in account `FT Tech IP Martech Prod (307164329441)` for experimentation without touching prod data.
- **S3:** `email-platform-ftcom-tps` bucket in the `FT Tech Infrastructure Prod(027104099916)` AWS account.
- **Secrets:** Doppler project `ft-tps-screener` (configs `dev` and `prod`).

## Using the App
### API
`POST https://tps-screener.ft.com/search`

Body:
```json
["07400000000"]
```

Response:
```json
{
  "results": [
    {
      "number": "07400000000",
      "canCall": false
    }
  ]
}
```

Salesforce is the primary consumer and relies on the `canCall` flag to suppress outbound dialling.

### UI
`https://tps-screener.ft.com/` provides a small form for manual lookups with visual pass/fail indicators.
### Setting up/App run

- Node ^22.x.x
- [Doppler CLI](https://docs.doppler.com/docs/install-cli) if new to Doppler click to install the CLI.

### Run the app locally

- Run `npm i`
- Run `doppler login`
- Run `npm run postinstall`
- Run `npm run start:dev`

**To spin up the local instance of the production app, run the commands below:**

- Replace the start command with `"start:prod-from-local": "doppler run -p ft-tps-screener -c prod -- node app.js"` in package.json.
- **_Note: Ensure the start command is reverted to its original state before merge into prod._**

Enter a UK number in the browser's search bar; if it's registered, it's important to refrain from contacting for sales and marketing purposes.


### Update Numbers Script
Purpose: Maintain an up to date TPS and CTPS lookup in DynamoDB by diffing the latest files from TPS SFTP against the copies stored in S3, then applying additions and deletions to the DynamoDB table.

What the job does
- Scheduled daily at 23:00 UTC via EventBridge
- Fetch our most recently stored TPS and CTPS baseline files from the S3 bucket, filenames are  `tps.txt` and `ctps.txt`
- Fetch the latest TPS and CTPS files from TPS SFTP also as txt files
Compute two sets for each list
-  additions: numbers present in the new file but not in the baseline
-  deletions: numbers present in the baseline but not in the new file
Apply changes to DynamoDB
  - Add additions to the table 
  - delete deletions from the table
- Persist the new files back to S3 as the new baseline

- Since this is a scheduled task, logs for this specific process can be found at `index=hako source="ft-tps-screener" host="scheduled-task.ft-tps-screener.eu-west-1.crm-review.ftweb.tech"`
- trigger: runs daily at 23:00 UTC via the EventBridge scheduled task; you can also execute it manually with `npm run update` (prod creds) or `npm run update-numbers` (dev via Doppler).


### Testing

- There is currently no staging environment to test this app. However one may test the app running it locally with the command:
`npm run start:dev`

- This will use the environment variables in the [dev Doppler config](https://dashboard.doppler.com/workplace/99fbb11f5bea112e94dd/projects/ft-tps-screener/configs/dev).
- Use `http://localhost:3000` to access TPS Screener.


## Where and How tps-lookup Runs
`ft-tps-screener` is hosted in AWS ECS via Hako in the CRM prod AWS account.

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
The only scheduled task in ft-tps-screener is to run `scripts/updateNumber.js` daily at 11pm UTC.

This is handled in AWS using EventBridge Scheduler, configured via the app.yaml in the scheduled-task stack.

Example:

```yaml
scheduled-task:
  type: scheduled-task
  parameters:
    TaskSchedule: "daily at 23:00"
 ```
⚠️ Times are always in UTC — so adjust accordingly for UK time (e.g. 23:00 UTC = midnight BST).

How to change the schedule:
1. Pull the repo and open:
`hako-config/apps/ft-tps-screener/crm-prod-eu-west-1/app.yaml`

2. Update the TaskSchedule under the scheduled-task stack.

3. Re-deploy using Hako:

Follow [Login and Deploy](https://financialtimes.atlassian.net/wiki/spaces/SF/pages/9086500865/CRM+Guide+Heroku+to+AWS+Migration+using+Hako#%3Aaws%3A---Login-%26-Deploy) steps 1 and 2.

4. If you're working on a PR or draft PR, it will automatically deploy to the review environment so you can validate the change.

5. Once validated, merge to master to apply the schedule in production.

6. Confirm the schedule in the AWS Console under:
Amazon EventBridge → Schedules


For more detail on hako:
- See the [CRM Hako Migration Guide](https://financialtimes.atlassian.net/wiki/spaces/SF/pages/9086500865/CRM+Guide+Heroku+to+AWS+Migration+using+Hako)
- Refer to the [Hako Wiki](https://github.com/Financial-Times/hako-cli/wiki)

## Development
When you push your branch to the remote repo and a PR is opened (including draft PR), if CircleCI checks are successful, `ft-tps-screener` is deployed to the AWS crm-review-eu-west-1 environment. We are not appending the PR number to the app name as with other configs due to a character limit when using Scheduled Task stacks:

`Properties validation failed for TaskEventBridgeScheduler with message: [#/Name:expected maxLength: 64, actual: 68]`

Once this is resolved/we have a workaround, we’ll use PR numbers in the app name.

### Logging

Logs are sent to splunk for AWS. See the Splunk queries below:
`update-number.js` script logs(scheduled task): 
```
index=hako source="ft-tps-screener" host="scheduled-task.ft-tps-screener.eu-west-1.crm-{{review or prod}}.ftweb.tech"
```

`index=hako source="ft-tps-screener" host="ft-tps-screener.eu-west-1.crm-prod.ftweb.tech"`

View errors using this search query

`index="hako" source="ft-tps-screener" host="ft-tps-screener.eu-west-1.crm-prod.ftweb.tech" level="error"`

There is currently no alerting for this app.

## Change API

This system uses Change API to log changes to this app. A deployment will trigger a Change API alert in the #CRM Alerts Slack channel

## Deployments

Any merge to master will trigger a deployment to AWS ECS Prod cluster.
