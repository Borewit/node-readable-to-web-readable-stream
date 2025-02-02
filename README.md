[![CI](https://github.com/Borewit/node-readable-to-web-readable-stream/actions/workflows/ci.yml/badge.svg)](https://github.com/Borewit/node-readable-to-web-readable-stream/actions/workflows/ci.yml)
[![NPM version](https://badge.fury.io/js/node-readable-to-web-readable-stream.svg)](https://npmjs.org/package/node-readable-to-web-readable-stream)
[![npm downloads](http://img.shields.io/npm/dm/node-readable-to-web-readable-stream.svg)](https://npmcharts.com/compare/node-readable-to-web-readable-stream?start=600&interval=30)

# node-readable-to-web-readable-stream

**node-readable-to-web-readable-stream** is a utility that converts a Node.js `Readable` stream into a WHATWG-compatible `ReadableStream`. This is particularly useful for integrating Node.js streams with web-native streaming APIs.

## Installation

Install the package using npm:

```bash
npm install node-readable-to-web-readable-stream
```

Or with yarn:

```bash
yarn add node-readable-to-web-readable-stream
```

## Usage

Here's how you can use this utility to convert a Node.js `Readable` stream into a web `ReadableStream`:

```javascript
import {makeByteReadableStreamFromNodeReadable} from 'node-readable-to-web-readable-stream';
import {createReadStream} from 'fs';

// Create a Node.js Readable stream
const nodeReadable = fs.createReadStream('example.txt');

// Convert to a web ReadableStream
const webReadable = makeByteReadableStreamFromNodeReadable(nodeReadable);

// Now you can use webReadable as a WHATWG ReadableStream
```

## API

### `toWebReadableStream(nodeReadable)`

- **Parameters:**
  - `nodeReadable` (Node.js `Readable`): The Node.js Readable stream to convert.

- **Returns:**
  - A WHATWG-compatible `ReadableStream`.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
