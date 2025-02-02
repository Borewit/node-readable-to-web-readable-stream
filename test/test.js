import {makeByteReadableStreamFromNodeReadable} from '../lib/index.js';
import path from 'node:path';
import {describe, it} from "mocha";
import {assert} from "chai";
import {fileURLToPath} from "node:url";
import {makeByteReadableStreamFromFile, SourceStream} from "./util.js";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

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

  it('read from a streamed data chunk', async () => {
    const nodeReadable = new SourceStream('\x05peter');
    try {
      const webReadableStream = makeByteReadableStreamFromNodeReadable(nodeReadable);
      try {
        const streamReader = webReadableStream.getReader({mode: 'byob'});
        try {

          let buf;
          let res;

          // read only one byte from the chunk
          buf = new Uint8Array(1);
          res = await streamReader.read(buf);
          assert.strictEqual(res.done, false, 'result.done');
          assert.strictEqual(res.value.length, 1, 'Should read exactly one byte');
          assert.strictEqual(res.value[0], 5, '0x05 == 5');

          // should decode string from chunk
          buf = new Uint8Array(5);
          res = await streamReader.read(buf);
          assert.strictEqual(res.done, false, 'result.done');
          assert.strictEqual(res.value.length, 5, 'Should read 5 bytes');
          assert.strictEqual(new TextDecoder('latin1').decode(res.value), 'peter');

          // should reject at the end of the stream
          buf = new Uint8Array(1);
          res = await streamReader.read(buf);
          assert.strictEqual(res.done, true, 'should indicate end of stream');
        } finally {
          streamReader.releaseLock();
        }
      } finally {
        await webReadableStream.cancel();
      }
    } finally {
      nodeReadable.destroy();
    }
  });
});

