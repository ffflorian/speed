import speedtest = require('speedtest-net');
import {promises as fs} from 'fs';
import * as path from 'path';

interface SpeedResult {
  date: Date;
  /** Bytes per second */
  downloadBandwidth: number;
  /** Milliseconds */
  ping: number;
  /** Bytes per second */
  uploadBandwidth: number;
}

const jsonFilePath = path.join(__dirname, '../speed-data.json');
const bytesInMegaByte = 1048576;

async function getSpeed(): Promise<SpeedResult> {
  let downloadPosted = false;
  let pingPosted = false;
  let uploadPosted = false;

  const progress = (event?: speedtest.SpeedTestEvent) => {
    switch (event?.type) {
      case 'download': {
        if (!downloadPosted) {
          console.info('Testing download speed ...');
          downloadPosted = true;
        }
        break;
      }
      case 'ping': {
        if (!pingPosted) {
          console.info('Testing ping latency ...');
          pingPosted = true;
        }
        break;
      }
      case 'upload': {
        if (!uploadPosted) {
          console.info('Testing upload speed ...');
          uploadPosted = true;
        }
        break;
      }
    }
  };

  const data = await speedtest({
    acceptGdpr: true,
    acceptLicense: true,
    progress,
  });

  return {
    date: new Date(),
    downloadBandwidth: data.download.bandwidth,
    ping: data.ping.latency,
    uploadBandwidth: data.upload.bandwidth,
  };
}

async function writeJSON(data: SpeedResult[], filePath: string): Promise<void> {
  const resolvedPath = path.resolve(filePath);
  const jsonData = JSON.stringify(data, null, 2);
  await fs.writeFile(resolvedPath, jsonData, 'utf-8');
}

async function readJSON(filePath: string): Promise<SpeedResult[]> {
  const resolvedPath = path.resolve(filePath);
  const jsonData = await fs.readFile(resolvedPath, 'utf-8');
  return JSON.parse(jsonData);
}

void (async () => {
  try {
    let allResults: SpeedResult[] = [];
    try {
      console.info('Reading JSON file ...');
      allResults = await readJSON(jsonFilePath);
      console.info(`Found ${allResults.length} entries.`);
    } catch (error) {}

    console.info('Testing internet speed ...');
    const newResult = await getSpeed();

    const readablePing = `${Math.round(newResult.ping)} ms`;
    const readableDownload = `${(newResult.downloadBandwidth / bytesInMegaByte).toFixed(2)} MB/s`;
    const readableUpload = `${(newResult.uploadBandwidth / bytesInMegaByte).toFixed(2)} MB/s`;

    console.info(`Ping: ${readablePing}, Download: ${readableDownload}, Upload: ${readableUpload}`);
    const appendedData = allResults.concat(newResult);

    console.info('Writing JSON file ...');
    await writeJSON(appendedData, jsonFilePath);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
