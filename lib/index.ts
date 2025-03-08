import type { Readable } from 'node:stream';

interface ByteReadableStreamFromNodeReadableOptions {
  highWaterMark?: number;
}

/**
 * Create a Web API default `ReadableStream<ArrayBufferView>` from a Node.js `stream.Readable`.
 * @param nodeReadable Node Stream to convert
 * @param options Options
 */
export function makeDefaultReadableStreamFromNodeReadable(nodeReadable: Readable, options: ByteReadableStreamFromNodeReadableOptions = {}): ReadableStream<ArrayBufferView> {
  let closed = false;
  const queueingStrategy = new ByteLengthQueuingStrategy({ highWaterMark: options.highWaterMark ?? 16 * 1024 });

  function close(controller: ReadableStreamDefaultController) {
    if(!closed) {
      closed = true;
      controller.close();
    }
  }

  return new ReadableStream({
    start(controller: ReadableStreamDefaultController) {
      nodeReadable.on('data', chunk => {
        if (closed) {
          return;
        }

        controller.enqueue(chunk);

        if (controller.desiredSize != null && controller.desiredSize <= 0) {
          // Apply backpressure if needed.
          nodeReadable.pause();
        }
      });

      nodeReadable.once('end', () => {
        close(controller); // Signal EOF
      });

      nodeReadable.once('error', err => {
        controller.error(err);
      });
    },
    pull(controller: ReadableStreamDefaultController) {
      if (nodeReadable.isPaused()) {
        nodeReadable.resume();
      }
    },
    cancel(reason) {
      closed = true; // Avoid controller is closed twice
      nodeReadable.destroy(reason);
    },
  }, queueingStrategy);
}

/**
 * Create a Web API byte `ReadableStream<Uint8Array>` from a Node.js `stream.Readable`.
 * @param nodeReadable Node Stream to convert
 * @param options Options
 */
export function makeByteReadableStreamFromNodeReadable(nodeReadable: Readable, options: ByteReadableStreamFromNodeReadableOptions = {}): ReadableStream<Uint8Array> {
  let closed = false;
  let isNodeStreamEnded = false;
  const highWaterMark = options.highWaterMark ?? 16 * 1024;
  const queue: Uint8Array[] = [];
  /**
   * Queue length in bytes
   */
  let queueLength = 0;
  let pullRequest = false

  function close(controller: ReadableByteStreamController) {
    if(!closed) {
      closed = true;
      controller.close();
    }
  }

  // This function will process any leftover bytes
  const processLeftover = (controller: ReadableByteStreamController): boolean => {
    const byobRequest = controller.byobRequest;
    const chunk = queue.shift();
    if (chunk) {
      queueLength -= chunk.length;
    }
    if (!byobRequest) {
      if (chunk) {
        controller.enqueue(chunk);
        return false;
      }
      if (isNodeStreamEnded) {
        close(controller); // Signal EOF
      }
      return true;
    }

    const view = byobRequest.view;
    if (!view) return true;

    if (!chunk) {
      if (isNodeStreamEnded) {
        close(controller); // Signal EOF
        byobRequest.respond(0); // Cancel BYOB request
        return false;
      }
      return true;
    }

    const bytesToCopy = Math.min(view.byteLength, chunk.length);
    new Uint8Array(view.buffer, view.byteOffset, bytesToCopy).set(
      chunk.subarray(0, bytesToCopy)
    );
    byobRequest.respond(bytesToCopy);

    if (bytesToCopy < chunk.length) {
      const remainder = chunk.subarray(bytesToCopy);
      queue.unshift(remainder);
      queueLength += remainder.length;
    }

    if (chunk.length === 0 && isNodeStreamEnded) {
      close(controller); // Signal EOF
      byobRequest.respond(0); // Cancel BYOB request
    }
    return false
  };

  return new ReadableStream({
    type: 'bytes',
    start(controller: ReadableByteStreamController) {
      nodeReadable.on('data', chunk => {
        queue.push(chunk);
        queueLength += chunk.length;
        if (pullRequest) {
          pullRequest = processLeftover(controller);
        }

        // Apply backpressure if needed.
        if (!nodeReadable.isPaused()) {
          if (queueLength > highWaterMark) {
            nodeReadable.pause();
          }
        }
      });

      nodeReadable.once('end', () => {
        isNodeStreamEnded = true;
        processLeftover(controller);
      });

      nodeReadable.once('error', err => {
        controller.error(err);
      });
    },
    pull(controller: ReadableByteStreamController) {
      pullRequest = processLeftover(controller);
      if (nodeReadable.isPaused() && queueLength < highWaterMark) {
        nodeReadable.resume();
      }
    },
    cancel(reason) {
      closed = true; // Avoid controller is closed twice
      nodeReadable.destroy(reason);
    },
  });
}
