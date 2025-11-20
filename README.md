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
- **Hosting:** App runs in AWS ECS via Hako. CI deploys ephemeral review builds to `crm-review-eu-west-1` with a default Time To Live (TTL) of two days; merges to `main` go to `crm-prod-eu-west-1`.

## Configuration & Data
- **DynamoDB (prod):** `ft-tps-screener-prod` in account `FT Tech IP CRM Prod`. Each item stores the phone number (primary key) plus `lastRetrieved`, which we update when a number is queried.
- **DynamoDB (test):** `ft-tps-screener-test` in account `FT Tech IP CRM Prod` for experimentation. There are a few numbers in the Database which can be used to query as part of testing to see if we get "canCall": true back for numbers in the DB and "canCall": false for numbers not
- **S3 (prod):** `ft-tps-screener-prod` bucket in the `FT Tech IP CRM Prod` AWS account.
- **S3 (test):** `ft-tps-screener-test` bucket in the `FT Tech IP CRM Prod` AWS account.
- **Secrets:** Doppler project `ft-tps-screener` (configs `dev` and `prod`).

## Using the App
### API (production)
`POST https://tps-screener.ft.com/search`

### API (ephemeral)
`POST https://ft-tps-screener-{ephemeral_id}.eu-west-1.crm-review.ftweb.tech/search`

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

- Since this is a scheduled task, logs for this specific process can be found at `index=hako source="ft-tps-screener" host="scheduled-task.ft-tps-screener.eu-west-1.crm-prod.ftweb.tech"`
- trigger: runs daily at 23:00 UTC via the EventBridge scheduled task; you can also execute it manually with `npm run update` (prod creds) or `npm run update-numbers` (dev via Doppler).

*note* ephemeral apps have a TTL of two days so this scheduled task will only run if the ephemeral app exists in the `crm-review-eu-west-1` cluster at the scheduled time.
If it runs, the logs can be viewed with this query:

`index=hako source="ft-tps-screener" host="scheduled-task.ft-tps-screener-{ephemeral_id}.eu-west-1.crm-review.ftweb.tech"`

### Testing

- When your development branch is pushed to Github an ephemeral app is created. You can test that the endpoint returns the `canCall` value using the instructions under the Using the App heading, above. 
- You can also test the app running it locally with the command:
`npm run start:dev`. This will use the environment variables in the [dev Doppler config](https://dashboard.doppler.com/workplace/99fbb11f5bea112e94dd/projects/ft-tps-screener/configs/dev).
- Use `http://localhost:3000` to access TPS Screener.

### Using the Changes Files for Testing and Debugging

The update numbers job now stores two additional files in S3(ft-tps-screener-{{test/prod}}) for every TPS and CTPS sync run:
- {{CTPS/TPS}}_additions.txt
- {{CTPS/TPS}}_deletions.txt

These files are written daily into a date structured path inside the S3 bucket:
```
changes/{{CTPS/TPS}}/<YYYY>/<MM>/<DD>/
  {{CTPS/TPS}}_additions.txt
  {{CTPS/TPS}}_deletions.txt
```

#### What these files contain

Each file lists the exact phone numbers that the job intended to add to Dynamo or remove from Dynamo during that specific run. The entries match the diff between the new TPS or CTPS file from SFTP and the baseline stored in S3.

#### Why this is useful?

Previously, when Dynamo looked incorrect or a number was missing from lookups, it was difficult to determine:

- what changes the update job attempted to apply on a given day
- whether the source file contained unexpected additions or deletions
- whether the issue was caused by Dynamo operations failing silently
- whether the baseline file was corrupted or incomplete

The changes files provide a clear audit trail so you can confirm:

- the exact set of additions that should have been written
- the exact set of deletions that should have been applied
- whether a specific number was expected to enter or leave the database on a given date

### How to use them
- Go to the relevant S3 bucket
- Navigate to
  changes/<tps or ctps>/<year>/<month>/<day>
- Open the additions or deletions file for that date
- Compare the contents with Dynamo or with the SFTP source to confirm whether the system behaved correctly

This makes it easier and faster to investigate issues such as:

- numbers present in the TPS or CTPS file but missing from Dynamo
- numbers removed unexpectedly
- discrepancies between the baseline and the new file
- partial failures during a sync run

The changes files give a daily snapshot of intended database modifications, allowing for direct and reliable debugging without needing to rerun diffs or manually compare source files.

## Where and How tps-lookup Runs
`ft-tps-screener` is hosted in AWS ECS via Hako in the CRM prod AWS account.

### Where to find it
Production environment:
AWS Console – ECS Prod Cluster (`crm-prod-eu-west-1`)
Look for the `ft-tps-screener` service

Review environment:
AWS Console – ECS Review Cluster (`crm-review-eu-west-1`). The system deploys an ephemeral app to this cluster which is removed after two days. You can also manually remove it before its TTL expires by using the following `hako` command, replacing the value in brackets with the ephemeral id created when you deployed:

```
hako app delete --app ft-tps-screener-{ephemeral_id} --env crm-review-eu-west-1
```

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

4. If you're working on a PR or draft PR, it will automatically deploy to the review environment as an ephemeral app so you can validate the change.

5. Once validated, merge to main to apply the schedule in production.

6. Confirm the schedule in the AWS Console under:
Amazon EventBridge → Schedules


For more detail on hako:
- See the [CRM Hako Migration Guide](https://financialtimes.atlassian.net/wiki/spaces/SF/pages/9086500865/CRM+Guide+Heroku+to+AWS+Migration+using+Hako)
- Refer to the [Hako Wiki](https://github.com/Financial-Times/hako-cli/wiki)

## Development
When you push your branch to the remote repo and a PR is opened (including draft PR), if CircleCI checks are successful, `ft-tps-screener` is deployed to the AWS crm-review-eu-west-1 environment. 

A truncated branch name or hashed version of such will be appended to the system name, for example: `ft-tps-screener-7ef538e-web` 

## Manual Checks
To manually verify whether a number recently added to the official TPS or CTPS list has been successfully ingested into our system, follow these steps:
- Go to the [Doppler TPS Production config](https://dashboard.doppler.com/workplace/99fbb11f5bea112e94dd/projects/ft-tps-screener/configs/prod)
- Retrieve the `SFTP_USERNAME` and `SFTP_PASSWORD` credentials
- Log in to the [TPS Corporate Dashboard](https://corporate.tpsonline.org.uk/login) using those credentials
- Once logged in, navigate to Download TPS → Quick Online Download → Changes Since, then select a recent date.
- Download the generated file, it contains numbers added since the selected date.
- You can then test these numbers by either:
  - Sending a request via Postman to https://tps-screener.ft.com/search
  - Manually searching on https://tps-screener.ft.com

### Fastly
The front-end of this system in production is served through Fastly. To monitor incoming requests and their statuses, follow these steps:

- Go to `ft.okta.com` and sign in.
- Select `Signal Sciences` to access the `Fastly` dashboard.
- Click on `Site` → `Internal Products`.
- Use the following query to view recent traffic for the production URL:
`from:-6h server:tps-screener.ft.com`. This shows the last 6 hours of traffic.
- To view the last 7 days of traffic, adjust the query as follows:
`from:-7d server:tps-screener.ft.com`

### Logging

Logs are sent to splunk for AWS. See the Splunk query for production below:
`update-number.js` script logs(scheduled task): 

`index=hako source="ft-tps-screener" host="ft-tps-screener.eu-west-1.crm-prod.ftweb.tech"`

View errors using this search query

`index="hako" source="ft-tps-screener" host="ft-tps-screener.eu-west-1.crm-prod.ftweb.tech" level="error"`

There is currently no alerting for this app.

## Change API

This system uses Change API to log changes to this app. A deployment will trigger a Change API alert in the #CRM Alerts Slack channel

## Deployments

Any merge to main will trigger a deployment to AWS ECS Prod cluster.
