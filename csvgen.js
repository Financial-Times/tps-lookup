const fs = require('fs');
//const es = require('event-stream');

const file = fs.readFileSync('./nums.dat');
console.log(file.length);

//const wstream = fs.createWriteStream('nums.dat');

//const arr = []
//for (let i = 0; i < 28000000; i++) {
  //console.log(i);
  //arr.push(`${(Math.floor(Math.random() * 1000000000))}\r\n`);
  ////wstream.write(`${(Math.floor(Math.random() * 1000000000))}\r\n`);
//}

//es.readArray(arr).pipe(wstream);
////wstream.end()
