import {makeByteReadableStreamFromNodeReadable, makeDefaultReadableStreamFromNodeReadable} from '../lib/index.js';
import path from 'node:path';
import {describe, it} from "mocha";
import {assert} from "chai";
import {fileURLToPath} from "node:url";
import {PassThrough} from "node:stream";
import {makeByteReadableStreamFromFile, makeDefaultReadableStreamFromFile, SourceStream} from "./util.js";
import process from "node:process";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

describe('Default ReadableStream From Node Readable', () => {

  describe('ReadableStreamDefaultReader', () => {

    it('read more data then available', async () => {

      const filePath = path.join(dirname, 'sample', 'bach-goldberg-variatians-05.sv8.mpc');

      const webStream = await makeDefaultReadableStreamFromFile(filePath);
      try {
        const reader = webStream.stream.getReader();
        try {
          let bytesRemaining = 4100;
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
        const webReadableStream = makeDefaultReadableStreamFromNodeReadable(nodeReadable);
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
        const webReadableStream = makeDefaultReadableStreamFromNodeReadable(nodeReadable);
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

    it('should apply backpressure, when data is not consumed', async () => {
      const nodePassThrough = new PassThrough();
      try {
        const webReadableStream = makeDefaultReadableStreamFromNodeReadable(nodePassThrough);
        try {
          const streamReader = webReadableStream.getReader();
          try {
            let result;
            let bytesWritten = 0;
            let pushMoreData;
            assert.isFalse(nodePassThrough.isPaused(), 'Node Readable is not paused of initialization');
            do {
              const data = new Uint8Array(256);
              pushMoreData = nodePassThrough.push(data);
              bytesWritten += data.length;
            } while(pushMoreData && bytesWritten < 128 * 1024);
            assert.isFalse(pushMoreData, 'Should eventually backpressure');
            assert.isTrue(nodePassThrough.isPaused(), 'Node Readable is paused');
            let bytesRead = 0;
            do {
              const {value, done} = await streamReader.read();
              assert.isFalse(done, 'Read stream result');
              bytesRead += value.length;
            } while(bytesRead < bytesWritten);
            const prom = streamReader.read(); // Read more than there is available
            assert.isFalse(nodePassThrough.isPaused(), 'Node Readable is paused after reading all bytes written');
            do {
              const data = new Uint8Array(256);
              pushMoreData = nodePassThrough.push(data);
              bytesWritten += data.length;
            } while(pushMoreData && bytesWritten < 128 * 1024);
            await prom;
            assert.isTrue(nodePassThrough.isPaused(), 'Node Readable is paused');
          } finally {
            streamReader.releaseLock();
          }
        } finally {
          await webReadableStream.cancel();
        }
      } finally {
        nodePassThrough.destroy();
      }
    });
  });
});

describe('Byte ReadableStream from Node Readable', () => {

  describe('ReadableStreamDefaultReader', () => {

    it('read more data then available', async () => {

      const filePath = path.join(dirname, 'sample', 'bach-goldberg-variatians-05.sv8.mpc');

      const webStream = await makeByteReadableStreamFromFile(filePath);
      try {
        const reader = webStream.stream.getReader();
        try {
          let bytesRemaining = 4100;
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

    it('should apply backpressure, when data is not consumed', async () => {
      const nodePassThrough = new PassThrough();
      try {
        const webReadableStream = makeByteReadableStreamFromNodeReadable(nodePassThrough);
        try {
          const streamReader = webReadableStream.getReader();
          try {
            let result;
            let bytesWritten = 0;
            let pushMoreData;
            assert.isFalse(nodePassThrough.isPaused(), 'Node Readable is not paused of initialization');
            do {
              const data = new Uint8Array(256);
              pushMoreData = nodePassThrough.push(data);
              bytesWritten += data.length;
            } while(pushMoreData && bytesWritten < 128 * 1024);
            assert.isFalse(pushMoreData, 'Should eventually backpressure');
            assert.isTrue(nodePassThrough.isPaused(), 'Node Readable is paused');
            let bytesRead = 0;
            do {
              const {value, done} = await streamReader.read();
              assert.isFalse(done, 'Read stream result');
              bytesRead += value.length;
            } while(bytesRead < bytesWritten);
            const prom = streamReader.read(); // Read more than there is available
            assert.isFalse(nodePassThrough.isPaused(), 'Node Readable is paused after reading all bytes written');
            do {
              const data = new Uint8Array(256);
              pushMoreData = nodePassThrough.push(data);
              bytesWritten += data.length;
            } while(pushMoreData && bytesWritten < 128 * 1024);
            await prom;
            assert.isTrue(nodePassThrough.isPaused(), 'Node Readable is paused');
          } finally {
            streamReader.releaseLock();
          }
        } finally {
          await webReadableStream.cancel();
        }
      } finally {
        nodePassThrough.destroy();
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
            res = await streamReader.read(buf, {min: buf.length});
            assert.strictEqual(res.done, false, 'result.done');
            assert.strictEqual(res.value.length, 1, 'Should read exactly one byte');
            assert.strictEqual(res.value[0], 5, '0x05 == 5');

            // should decode string from chunk
            buf = new Uint8Array(5);
            res = await streamReader.read(buf, {min: buf.length});
            assert.strictEqual(res.value.length, 5, 'Should read 5 bytes');
            assert.strictEqual(new TextDecoder('latin1').decode(res.value), 'peter');

            if (!res.done) {
              // should reject at the end of the stream, if not already done
              buf = new Uint8Array(1);
              res = await streamReader.read(buf);
              assert.strictEqual(res.done, true, 'should indicate end of stream');
            }
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

    it('should apply backpressure, when data is not consumed', async () => {
      const nodePassThrough = new PassThrough();
      try {
        const webReadableStream = makeByteReadableStreamFromNodeReadable(nodePassThrough);
        try {
          const streamReader = webReadableStream.getReader({mode: 'byob'});
          try {
            let result;
            let bytesWritten = 0;
            const data = new Uint8Array(256);
            let pushMoreData;
            assert.isFalse(nodePassThrough.isPaused(), 'Node Readable should not be paused after initialization');
            do {
              pushMoreData = nodePassThrough.push(data);
              bytesWritten += data.length;
            } while(pushMoreData && bytesWritten < 32 * 1024);
            assert.isTrue(nodePassThrough.isPaused(), 'Node Readable is paused');

            let bytesRead = 0;
            do {
              const buf = new Uint8Array(256);
              const {value, done} = await streamReader.read(buf);
              assert.isFalse(done, 'Read stream result');
              bytesRead += value.length;
            } while(bytesRead < bytesWritten);
            const buf = new Uint8Array(256);
            const prom = streamReader.read(buf); // Read more than there is available
            assert.isFalse(nodePassThrough.isPaused(), 'Node Readable is paused after reading all bytes written');
            do {
              pushMoreData = nodePassThrough.push(data);
              bytesWritten += data.length;
            } while(pushMoreData && bytesWritten < 64 * 1024);
            await prom;
            assert.isTrue(nodePassThrough.isPaused(), 'Node Readable is paused');
          } finally {
            streamReader.releaseLock();
          }
        } finally {
          await webReadableStream.cancel();
        }
      } finally {
        nodePassThrough.destroy();
      }
    });

    it('should handle pending pull requests', async function(){

      const filePath = path.join(dirname, 'sample', 'flac.flac');

      const webStream = await makeByteReadableStreamFromFile(filePath);
      try {
        const reader = webStream.stream.getReader({mode: 'byob'});
        let buffer;
        let result;
        const bytesToRead = 175710
        buffer = new Uint8Array(bytesToRead);
        result = await reader.read(buffer, {min: bytesToRead});
        assert.isFalse(result.done, `After reading ${bytesToRead} bytes: result.done`);
        if (process.versions.node && process.versions.node.split('.').map(Number)[0] >= 20 && !process.versions.bun) {
          assert.strictEqual(result.value.length, bytesToRead,`After reading ${bytesToRead} bytes: result.value.length`);
        } else {
          assert.isBelow(result.value.length, bytesToRead,`Expect min bytes option not to be implemented ${result.value.length}<${bytesToRead}`);
        }
      } finally {
        webStream.stream.cancel();
      }
    });

  });

});



