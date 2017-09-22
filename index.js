const fs = require('fs');

function getSizeString(size) {
  switch(size) {
    case 0: return 'none';
    case 1: return 'very-low';
    case 2: return 'low';
    case 3: return 'normal';
    case 4: return 'high';
    case 5: return 'very-high';
  }
}

function parse(mes) {
  if (!mes.startsWith('>>>') || !mes.endsWith('<<<')) {
    console.log("Error: Expected map exchange string starting with >>> and ending with <<<.");
    return null;
  }

  mes = mes.replace('>>>', '').replace('<<<', '');
  const buffer = Buffer.from(mes, 'base64');

  try {
    const CRC32 = require('crc-32');
    if (CRC32.buf(buffer.slice(0, buffer.length - 4)) != buffer.readInt32LE(buffer.length - 4)) {
      console.log("CRC does not match!");
      return null;
    }
  } catch (err) {
    console.log("Warning! crc-32 module not detected, skipping CRC check.");
  }

  const parsed = {};

  console.log('Version - ' + buffer.readInt16LE(0) + '.' + buffer.readInt16LE(2) + '.' + buffer.readInt16LE(4) + '.' + buffer.readInt16LE(6));
  parsed.terrain_segmentation = getSizeString(buffer.readInt8(8));
  parsed.water = getSizeString(buffer.readInt8(9));
  parsed.autoplace_controls = {};


  const length = buffer.readInt32LE(10);
  let offset = 14;
  for (let i = 0; i < length; i++) {
    const strLen = buffer.readInt32LE(offset);
    offset += 4;
    const key = buffer.toString('ascii', offset, offset + strLen);
    offset += strLen;
    parsed.autoplace_controls[key] = {};
    parsed.autoplace_controls[key].frequency = getSizeString(buffer.readInt8(offset));
    parsed.autoplace_controls[key].size = getSizeString(buffer.readInt8(offset + 1));
    parsed.autoplace_controls[key].richness = getSizeString(buffer.readInt8(offset + 2));
    offset += 3;
  }
  parsed.seed = buffer.readInt32LE(offset);
  parsed.width = buffer.readInt32LE(offset + 4);
  parsed.height = buffer.readInt32LE(offset + 8);
  parsed.starting_area = getSizeString(buffer.readInt8(offset + 12));
  parsed.peaceful_mode = buffer.readInt8(offset + 13);

  return parsed;
}

function usage() {
  console.log(`Usage: ${process.argv[0]} ${process.argv[1]} >>>MAP_EXCHANGE_STRING<<< [OUTPUT_FILE]`);
}

const mes = process.argv[2];
const file = process.argv[3];
if (!mes) {
  console.log("First argument should be the map exchange string!");
  usage();
} else if (mes.includes('help')) {
  usage();
} else {
  const parsed = JSON.stringify(parse(mes), null, 2)
  if (file) {
    console.log("Saving output to file: " + file);
    fs.writeFile(file, parsed, function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("File saved!");
});
  }
  console.log(parsed);
}
