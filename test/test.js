import { makeByteReadableStreamFromNodeReadable } from '../lib/index.js';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

import { describe, it } from "mocha";
import { assert } from "chai";
import { fileURLToPath } from "node:url";

export async function makeByteReadableStreamFromFile(filename) {

  const fileInfo = await stat(filename);
  const nodeStream = createReadStream(filename);

  return {
    fileSize: fileInfo.size,
    stream: makeByteReadableStreamFromNodeReadable(nodeStream)
  };
}

describe('makeByteReadableStreamFromFile()', () => {

  it('read more data then available', async () => {

    const filePath = path.join(dirname, 'sample', 'bach-goldberg-variatians-05.sv8.mpc');

    const webStream = await makeByteReadableStreamFromFile(filePath);
    try {
      const reader = webStream.stream.getReader({mode: 'byob'});
      try {
        const bytesRequested = 4100;
        let bytesRemaining = bytesRequested;
        let bytesRead = 0;
        let result;
        do {
          result = await reader.read(new Uint8Array(bytesRemaining));
          if (result.done) break;
          bytesRemaining -= result.value.length;
          bytesRead += result.value.length;
        } while ((bytesRemaining > 0));
        assert.strictEqual(bytesRead, 3346, 'bytes read');
      } finally {
        reader.releaseLock();
      }
    } finally {
      webStream.stream.cancel();
    }
  });
});

