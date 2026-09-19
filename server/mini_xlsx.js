const fs = require('fs');
const zlib = require('zlib');

/**
 * 极轻量 XLSX / ZIP 生成与解析器（无外部依赖，基于 Node.js 原生 Buffer & zlib）
 */
const MiniXLSX = {
    // CRC32 计算表
    _crcTable: (() => {
        let c;
        const table = [];
        for (let n = 0; n < 256; n++) {
            c = n;
            for (let k = 0; k < 8; k++) {
                c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
            }
            table[n] = c;
        }
        return table;
    })(),

    _crc32: function (buf) {
        let crc = 0 ^ (-1);
        for (let i = 0; i < buf.length; i++) {
            crc = (crc >>> 8) ^ this._crcTable[(crc ^ buf[i]) & 0xFF];
        }
        return (crc ^ (-1)) >>> 0;
    },

    /**
     * 生成标准 ZIP (XLSX) 文件
     */
    buildZip: function (files) {
        const localParts = [];
        const cdEntries = [];
        let offset = 0;

        files.forEach(file => {
            const nameBuf = Buffer.from(file.name, 'utf8');
            const dataBuf = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, 'utf8');
            const compressed = zlib.deflateRawSync(dataBuf);
            const crc = this._crc32(dataBuf);

            // Local Header (30 bytes + nameBuf.length)
            const lh = Buffer.alloc(30);
            lh.writeUInt32LE(0x04034b50, 0);
            lh.writeUInt16LE(20, 4); // min version
            lh.writeUInt16LE(0, 6);  // flags
            lh.writeUInt16LE(8, 8);  // compression = deflate
            lh.writeUInt16LE(0, 10); // time
            lh.writeUInt16LE(0, 12); // date
            lh.writeUInt32LE(crc, 14);
            lh.writeUInt32LE(compressed.length, 18);
            lh.writeUInt32LE(dataBuf.length, 22);
            lh.writeUInt16LE(nameBuf.length, 26);
            lh.writeUInt16LE(0, 28);

            localParts.push(lh, nameBuf, compressed);

            // Central Directory Entry (46 bytes + nameBuf.length)
            const cd = Buffer.alloc(46);
            cd.writeUInt32LE(0x02014b50, 0);
            cd.writeUInt16LE(20, 4);
            cd.writeUInt16LE(20, 6);
            cd.writeUInt16LE(0, 8);
            cd.writeUInt16LE(8, 10);
            cd.writeUInt16LE(0, 12);
            cd.writeUInt16LE(0, 14);
            cd.writeUInt32LE(crc, 16);
            cd.writeUInt32LE(compressed.length, 20);
            cd.writeUInt32LE(dataBuf.length, 24);
            cd.writeUInt16LE(nameBuf.length, 28);
            cd.writeUInt16LE(0, 30);
            cd.writeUInt16LE(0, 32);
            cd.writeUInt16LE(0, 34);
            cd.writeUInt16LE(0, 36);
            cd.writeUInt32LE(0, 38);
            cd.writeUInt32LE(offset, 42);

            cdEntries.push(cd, nameBuf);
            offset += 30 + nameBuf.length + compressed.length;
        });

        const cdStart = offset;
        const cdBuf = Buffer.concat(cdEntries);
        const cdSize = cdBuf.length;

        // End of central directory record (22 bytes)
        const eocd = Buffer.alloc(22);
        eocd.writeUInt32LE(0x06054b50, 0);
        eocd.writeUInt16LE(0, 4);
        eocd.writeUInt16LE(0, 6);
        eocd.writeUInt16LE(files.length, 8);
        eocd.writeUInt16LE(files.length, 10);
        eocd.writeUInt32LE(cdSize, 12);
        eocd.writeUInt32LE(cdStart, 16);
        eocd.writeUInt16LE(0, 20);

        return Buffer.concat([...localParts, cdBuf, eocd]);
    },

    /**
     * 将对象数组写为 .xlsx 文件
     */
    writeXlsx: function (filePath, rows, headers) {
        if (!headers || !headers.length) {
            headers = rows.length > 0 ? Object.keys(rows[0]) : [];
        }

        const escapeXml = (str) => {
            return String(str === undefined || str === null ? '' : str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        };

        const colName = (n) => {
            let s = '';
            while (n >= 0) {
                s = String.fromCharCode((n % 26) + 65) + s;
                n = Math.floor(n / 26) - 1;
            }
            return s;
        };

        let sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
        sheetXml += '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n<sheetData>\n';

        // 写入表头 (Row 1)
        sheetXml += '<row r="1">\n';
        headers.forEach((h, colIdx) => {
            const cellRef = `${colName(colIdx)}1`;
            sheetXml += `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(h)}</t></is></c>\n`;
        });
        sheetXml += '</row>\n';

        // 写入数据行 (Row 2 ~ N)
        rows.forEach((row, rowIdx) => {
            const rNum = rowIdx + 2;
            sheetXml += `<row r="${rNum}">\n`;
            headers.forEach((h, colIdx) => {
                const cellRef = `${colName(colIdx)}${rNum}`;
                const val = row[h];
                sheetXml += `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(val)}</t></is></c>\n`;
            });
            sheetXml += '</row>\n';
        });

        sheetXml += '</sheetData>\n</worksheet>';

        const contentTypesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n' +
            '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n' +
            '  <Default Extension="xml" ContentType="application/xml"/>\n' +
            '  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>\n' +
            '  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>\n' +
            '</Types>';

        const relsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n' +
            '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>\n' +
            '</Relationships>';

        const workbookXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n' +
            '  <sheets>\n' +
            '    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>\n' +
            '  </sheets>\n' +
            '</workbook>';

        const workbookRelsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n' +
            '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>\n' +
            '</Relationships>';

        const zipBuffer = this.buildZip([
            { name: '[Content_Types].xml', data: contentTypesXml },
            { name: '_rels/.rels', data: relsXml },
            { name: 'xl/workbook.xml', data: workbookXml },
            { name: 'xl/_rels/workbook.xml.rels', data: workbookRelsXml },
            { name: 'xl/worksheets/sheet1.xml', data: sheetXml }
        ]);

        fs.writeFileSync(filePath, zipBuffer);
    },

    /**
     * 解析 ZIP 文件获取各部件内容
     */
    readZip: function (buffer) {
        const files = {};
        let i = 0;
        while (i < buffer.length - 4) {
            const sig = buffer.readUInt32LE(i);
            if (sig === 0x04034b50) { // Local File Header
                const method = buffer.readUInt16LE(i + 8);
                const compSize = buffer.readUInt32LE(i + 18);
                const uncompSize = buffer.readUInt32LE(i + 22);
                const nameLen = buffer.readUInt16LE(i + 26);
                const extraLen = buffer.readUInt16LE(i + 28);
                const name = buffer.toString('utf8', i + 30, i + 30 + nameLen);
                const dataStart = i + 30 + nameLen + extraLen;
                const rawData = buffer.slice(dataStart, dataStart + compSize);

                let uncompressed;
                if (method === 0) {
                    uncompressed = rawData;
                } else if (method === 8) {
                    uncompressed = zlib.inflateRawSync(rawData);
                } else {
                    uncompressed = rawData;
                }

                files[name] = uncompressed;
                i = dataStart + compSize;
            } else if (sig === 0x02014b50 || sig === 0x06054b50) {
                break;
            } else {
                i++;
            }
        }
        return files;
    },

    /**
     * 读取 .xlsx 文件，返回数据对象数组
     */
    readXlsx: function (filePath) {
        if (!fs.existsSync(filePath)) return [];
        const buffer = fs.readFileSync(filePath);
        const files = this.readZip(buffer);

        // 1. 读取 sharedStrings (若存在)
        const sharedStrings = [];
        if (files['xl/sharedStrings.xml']) {
            const ssXml = files['xl/sharedStrings.xml'].toString('utf8');
            const siMatches = ssXml.match(/<si>[\s\S]*?<\/si>/g) || [];
            siMatches.forEach(si => {
                const tMatches = si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
                const text = tMatches.map(t => t.replace(/<[^>]+>/g, '')).join('');
                sharedStrings.push(text);
            });
        }

        // 2. 读取 sheet1.xml
        const sheetBuffer = files['xl/worksheets/sheet1.xml'];
        if (!sheetBuffer) return [];
        const sheetXml = sheetBuffer.toString('utf8');

        // 正则提取所有 <row r="...">...</row>
        const rowMatches = sheetXml.match(/<row[^>]*>[\s\S]*?<\/row>/g) || [];
        const tableRows = [];

        rowMatches.forEach(rowXml => {
            // 提取所有单元格 <c r="A1" ...>...</c>
            const cellMatches = rowXml.match(/<c[^>]*>[\s\S]*?<\/c>|<c[^>]*\/>/g) || [];
            const rowData = {};

            cellMatches.forEach(cellXml => {
                const rMatch = cellXml.match(/r="([A-Z]+)(\d+)"/);
                if (!rMatch) return;
                const colLetter = rMatch[1];

                const tMatch = cellXml.match(/t="([^"]+)"/);
                const cellType = tMatch ? tMatch[1] : 'n';

                let val = '';
                if (cellType === 'inlineStr') {
                    const isMatch = cellXml.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/);
                    val = isMatch ? isMatch[1] : '';
                } else if (cellType === 's') { // shared string
                    const vMatch = cellXml.match(/<v>([\s\S]*?)<\/v>/);
                    const idx = vMatch ? parseInt(vMatch[1], 10) : -1;
                    val = (idx >= 0 && idx < sharedStrings.length) ? sharedStrings[idx] : '';
                } else {
                    const vMatch = cellXml.match(/<v>([\s\S]*?)<\/v>/);
                    val = vMatch ? vMatch[1] : '';
                }

                // 反转义常见 XML 实体
                val = val.replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&apos;/g, "'");

                rowData[colLetter] = val.trim();
            });

            tableRows.push(rowData);
        });

        if (tableRows.length < 2) return [];

        // 第一行作为 headers
        const headerRow = tableRows[0];
        const colKeys = Object.keys(headerRow);
        const headers = {};
        colKeys.forEach(k => {
            headers[k] = headerRow[k];
        });

        const records = [];
        for (let i = 1; i < tableRows.length; i++) {
            const row = tableRows[i];
            const record = {};
            let hasValue = false;
            colKeys.forEach(col => {
                const headerName = headers[col];
                const cellVal = row[col] !== undefined ? row[col] : '';
                if (cellVal !== '') hasValue = true;
                record[headerName] = cellVal;
            });
            if (hasValue) {
                records.push(record);
            }
        }

        return records;
    }
};

module.exports = MiniXLSX;