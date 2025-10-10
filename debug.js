const logger = require("./helper/logger.js");
const config = require("./config");
logger.info({ event: "Starting debug.js" });

const writeEnv = () => {
const port = config.PORT;

logger.info({event: `listening on port ${port}`});
}

writeEnv();

logger.info({event: `finished running debug.js`});