import {makeByteReadableStreamFromNodeReadable} from '../lib/index.js';
import path from 'node:path';
import {describe, it} from "mocha";
import {assert} from "chai";
import {fileURLToPath} from "node:url";
import {makeByteReadableStreamFromFile, SourceStream} from "./util.js";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

describe('ReadableStreamDefaultReader', () => {

  const mode = 'byob';

  it('read more data then available', async () => {

    const filePath = path.join(dirname, 'sample', 'bach-goldberg-variatians-05.sv8.mpc');

    const webStream = await makeByteReadableStreamFromFile(filePath);
    try {
      const reader = webStream.stream.getReader();
      try {
        const bytesRequested = 4100;
        let bytesRemaining = bytesRequested;
        let bytesRead = 0;
        let result
        do {
          result = await reader.read();
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

  it('read more data then available #2', async () => {
    const nodeReadable = new SourceStream('123');
    try {
      const webReadableStream = makeByteReadableStreamFromNodeReadable(nodeReadable);
      try {
        const streamReader = webReadableStream.getReader();
        try {
          let res = await streamReader.read();
          assert.strictEqual(res.done, false, 'result.done');
          assert.equal(res.value.length, 3, 'should indicate only 3 bytes are actually read');
          res = await streamReader.read();
          assert.strictEqual(res.done, true, 'result.done');
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

  it('read from a streamed data chunk', async () => {
    const nodeReadable = new SourceStream('\x05peter');
    try {
      const webReadableStream = makeByteReadableStreamFromNodeReadable(nodeReadable);
      try {
        const streamReader = webReadableStream.getReader();
        try {

          let buf;
          let res;

          // read only one byte from the chunk
          res = await streamReader.read();
          assert.strictEqual(res.done, false, 'result.done');
          assert.strictEqual(res.value.length, 6, 'Should read exactly one byte');
          assert.strictEqual(res.value[0], 5, '0x05 == 5');
          assert.strictEqual(new TextDecoder('latin1').decode(res.value.subarray(1)), 'peter');

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

describe('ReadableStreamBYOBReader', () => {

  const mode = 'byob';

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

  it('read more data then available #2', async () => {
    const nodeReadable = new SourceStream('123');
    try {
      const webReadableStream = makeByteReadableStreamFromNodeReadable(nodeReadable);
      try {
        const streamReader = webReadableStream.getReader({mode: 'byob'});
        try {

          let res;
          let buf = new Uint8Array(4);
          res = await streamReader.read(buf);
          assert.strictEqual(res.done, false, 'result.done');
          assert.equal(res.value.length, 3, 'should indicate only 3 bytes are actually read');
          buf = new Uint8Array(4);
          res = await streamReader.read(buf);
          assert.strictEqual(res.done, true, 'result.done');
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

