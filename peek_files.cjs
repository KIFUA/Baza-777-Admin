const fs = require('fs');

function peek(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(100);
    fs.readSync(fd, buffer, 0, 100, 0);
    fs.closeSync(fd);
    console.log(`--- Peek ${filePath} ---`);
    console.log('Hex:', buffer.toString('hex'));
    console.log('Text (ASCII):', buffer.toString('ascii').replace(/[^\x20-\x7E]/g, '.'));
    console.log('Text (UTF-8):', buffer.toString('utf8').replace(/[^\x20-\x7E]/g, '.'));
  } catch (err) {
    console.error(`Error peeking ${filePath}:`, err.message);
  }
}

peek('/app/applet/tablyci/anketa.xlsx');
peek('/app/applet/tablyci/z_1.xlsx');
