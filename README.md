[![CI](https://github.com/Borewit/node-readable-to-web-readable-stream/actions/workflows/ci.yml/badge.svg)](https://github.com/Borewit/node-readable-to-web-readable-stream/actions/workflows/ci.yml)

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
const { toWebReadableStream } = require('node-readable-to-web-readable-stream');
const fs = require('fs');

// Create a Node.js Readable stream
const nodeReadable = fs.createReadStream('example.txt');

// Convert to a web ReadableStream
const webReadable = toWebReadableStream(nodeReadable);

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
