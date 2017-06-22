const fs = require('fs');

const wstream = fs.createWriteStream('nums.dat');

let nums = ''; 
for (let i = 0; i < 30000000; i++) {
  fs.appendFileSync(JSON.stringify(`${(Math.floor(Math.random() * 1000000000))}\r\n`));
}
