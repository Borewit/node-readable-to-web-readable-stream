import {stat} from "node:fs/promises";
import {createReadStream} from "node:fs";
import {Readable} from "node:stream";
import {makeByteReadableStreamFromNodeReadable} from "../lib/index.js";

export async function makeByteReadableStreamFromFile(filename) {

  const fileInfo = await stat(filename);
  const nodeStream = createReadStream(filename);

  return {
    fileSize: fileInfo.size,
    stream: makeByteReadableStreamFromNodeReadable(nodeStream)
  };
}

/**
 * A mock Node.js readable-stream, using string to read from
 */
export class SourceStream extends Readable {

  delay = 0;

  constructor(str = '', delay = 0) {
    super();
    if (delay !== undefined) {
      this.delay = delay;
    }
    this.buf = new TextEncoder().encode(str);
  }

  _read() {
    setTimeout(() => {
      this.push(this.buf);
      this.push(null); // Signal end of stream
    }, this.delay);
  }
}

/**
 * Convert callback to Promise, on closing a node stream
 */
export function closeNodeStream(stream) {
  return new Promise((resolve, reject) => {
    stream.close(err => {
      if(err)
        reject(err);
      else
        resolve();
    });
  })
}