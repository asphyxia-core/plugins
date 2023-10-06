const fs = require('fs');
const path = require('path');

export function unpackS3P(directory, filePath, names) {
    const stream = fs.readFileSync(filePath);
    if (stream.slice(0, 4).toString() !== 'S3P0') {
        throw new Error('Invalid S3P file');
    }

    let offset = 4;
    const entries = stream.readUInt32LE(offset);
    offset += 4;

    const offsets = [];
    for (let i = 0; i < entries; i++) {
        const offsetValue = stream.readUInt32LE(offset);
        offset += 4;
        const length = stream.readUInt32LE(offset);
        offset += 4;
        offsets.push([offsetValue, length]);
    }

    

    for (let n = 0; n < offsets.length; n++) {
        const [offsetValue, length] = offsets[n];
        offset = offsetValue;
        if (stream.slice(offset, offset + 4).toString() !== 'S3V0') {
            throw new Error('Invalid S3V0 header');
        }
        offset += 4;
        const hlen = stream.readUInt32LE(offset);
        offset += 4;
        const headerExtra = stream.slice(offset, offset + hlen - 8);
        offset += hlen - 8;
        // const [wmaFileLength, , , , , , ,] = new Uint32Array(headerExtra.buffer);

        const data = stream.slice(offset, offset + length - hlen);
        offset += length - hlen;

        const outPath = path.join(directory, `${names[n] || n}.wma`);
        console.log(`I: ${outPath}`);
        fs.writeFileSync(outPath, data);
    }
}

export function packS3P(directory, output, names) {
    let paths = fs.readdirSync(directory);
    if (names) {
        const namesBack = {};
        for (const key in names) {
            namesBack[names[key]] = key;
        }
        paths = paths.filter((i) => namesBack[i.split('.')[0]]);
        paths.sort((a, b) => namesBack[a.split('.')[0]] - namesBack[b.split('.')[0]]);
    } else {
        paths.sort((a, b) => parseInt(a.split('.')[0]) - parseInt(b.split('.')[0]));
    }

    let offset = 0;
    const out = Buffer.alloc(4 + 4 + 8 * paths.length);

    out.write('S3P0', offset, 'binary');
    offset += 4;

    out.writeUInt32LE(paths.length, offset);
    offset += 4;

    for (let i = 0; i < paths.length; i++) {
        out.writeUInt32LE(0, offset);
        offset += 4;
        out.writeUInt32LE(0, offset);
        offset += 4;
    }

    const offsets = [];
    for (const i of paths) {
        const data = fs.readFileSync(path.join(directory, i));
        offsets.push([offset, data.length + 32]);

        out.write('S3V0', offset, 'binary');
        offset += 4;

        out.writeUInt32LE(32, offset);
        offset += 4;

        const headerExtra = Buffer.alloc(20);
        headerExtra.writeUInt32LE(data.length, 0);
        headerExtra.writeUInt32LE(0, 4); // You might need to adjust this value
        headerExtra.writeUInt32LE(64130, 8);
        out.writeUInt16LE(0, 12); // Short
        out.writeUInt16LE(0, 14); // Short
        out.writeUInt16LE(0, 16); // Short
        out.writeUInt16LE(0, 18); // Short
        out.writeUInt32LE(0, 20); // Reserved
        headerExtra.copy(out, offset + 4, 0, 20); // Copy headerExtra excluding the first 4 bytes
        offset += 24;

        data.copy(out, offset, 0, data.length);
        offset += data.length;
    }

    // Re-write tracks table
    offset = 8;
    for (const [offsetValue, length] of offsets) {
        out.writeUInt32LE(offsetValue, offset);
        offset += 4;
        out.writeUInt32LE(length, offset);
        offset += 4;
    }

    fs.writeFileSync(output, out);
}


function usage() {
    console.log(`Usage: node ${process.argv[1]} pack <output.s3p> <directory> [enum/def path]`);
    console.log(`       node ${process.argv[1]} unpack <intput.s3p> <directory> [enum/def path]`);
    process.exit(1);
}

function loadNames(filePath) {
    const base = path.join(path.dirname(filePath), path.basename(filePath, path.extname(filePath)));
    const filenames = {};

    if (fs.existsSync(base + '.def')) {
        const defData = fs.readFileSync(base + '.def', 'utf8');
        const lines = defData.split('\n');
        for (const line of lines) {
            if (line.trim().startsWith('#define')) {
                const [, name, id] = line.trim().split(/\s+/);
                filenames[parseInt(id)] = name;
            }
        }
    } else if (fs.existsSync(base + '.enum')) {
        const enumData = fs.readFileSync(base + '.enum', 'utf8');
        if (enumData.startsWith('enum struct ')) {
            const lines = enumData.split('\n');
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line === '};') {
                    break;
                }
                filenames[i - 1] = line.replace(',', '').trim();
            }
        }
    }

    return filenames;
}

// function main() {
//     if (process.argv.length !== 5 && process.argv.length !== 6) {
//         usage();
//     }
//     if (process.argv[2] !== 'pack' && process.argv[2] !== 'unpack') {
//         usage();
//     }

//     const s3p = process.argv[3];
//     const directory = process.argv[4];

//     let names = {};
//     if (process.argv.length === 6) {
//         names = loadNames(process.argv[5]);
//     } else {
//         names = loadNames(s3p);
//     }

//     if (!names) {
//         console.log('W: Filenames not loaded');
//     }

//     if (process.argv[2] === 'pack') {
//         if (!fs.existsSync(directory)) {
//             console.error(`F: No such file or directory ${directory}`);
//             process.exit(1);
//         }

//         const files = fs.readdirSync(directory);
//         if (!files.every((i) => /^\d+\.wma$/.test(i) || Object.values(names).includes(i.split('.')[0]))) {
//             console.error('F: Files must all be [number].wma');
//             process.exit(1);
//         }

//         const dirname = path.dirname(s3p);
//         if (dirname) {
//             fs.mkdirSync(dirname, { recursive: true });
//         }

//         packS3P(directory, s3p, names);
//         console.log(`I: ${s3p}`);
//     } else {
//         if (!fs.existsSync(s3p)) {
//             console.error(`F: No such file or directory ${s3p}`);
//             process.exit(1);
//         }

//         if (fs.existsSync(directory) && !fs.lstatSync(directory).isDirectory()) {
//             console.error('F: Output is not a directory');
//             process.exit(1);
//         }

//         fs.mkdirSync(directory, { recursive: true });
//         unpackS3P(directory, s3p, names);
//     }
// }

// if (require.main === module) {
//     main();
// }
