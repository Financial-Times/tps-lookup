require('dotenv').load({ silent: true });

const express = require('express');
const co = require('co');
const bodyParser = require('body-parser');
const Client = require('ssh2');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { notFound, errorMiddleware } = require('./errors');

const app = new express();
const FILENAME = 'tps.dat';
const connSettings = {
  host: config.sftpHost,
  port: config.sftpPort,
  username: config.sftpUsername,
  password: config.sftpPassword
};
const numbers = {};

app.use(bodyParser.json());

app.post('/search', (req, res, next) => {
  if (!Array.isArray(req.body)) {
    return next({ message: 'Must provide array of numbers', status: 400 })
  }
  const results = req.body.map((num) => {
    return {
      number: num,
      canCall: numbers[num.replace(/\s/g, '')] || false
    };
  });

  res.json({ results });
});

app.use(notFound);
app.use(errorMiddleware);

const conn = new Client();
conn.on('ready', () => {
  const moveFrom = `./${FILENAME}`;
  const moveTo = `/tmp/${FILENAME}`;

  conn.sftp((err, sftp) => {
    if (err) {
      throw err;
    }

    sftp.fastGet(moveFrom, moveTo, {}, (downloadErr) => {
      if (downloadErr) {
        throw downloadErr;
      }

      // turn into map for constant lookup
      // trim spaces from numbers
      fs.readFileSync(`/tmp/${FILENAME}`).toString().split(/\r?\n/).forEach(num => {
        numbers[num] = true;
      });

      app.listen(config.PORT, () => {
        console.log(`App listening on ${config.PORT}`);
      });

    });
  });
}).connect(connSettings);
