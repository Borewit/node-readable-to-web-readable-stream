// Utilities for testing

import type { Readable } from 'node:stream';
import {ReadableStream, type ReadableByteStreamController, type ReadableStreamBYOBRequest} from 'node:stream/web';

export function makeByteReadableStreamFromNodeReadable(nodeReadable: Readable): ReadableStream {
  let leftoverChunk: Uint8Array | null = null; // Proper declaration
  let isNodeStreamEnded = false;
  /**
   * Number of bytes in leftoverChunk, after which backpressure is applied
   */
  const highWaterMark = 16 * 1024;

  const processLeftover = (controller: ReadableByteStreamController) => {
    const byobRequest = controller.byobRequest as ReadableStreamBYOBRequest | undefined;

    if (!byobRequest) {
      if(leftoverChunk && leftoverChunk.length > 0) {
        controller.enqueue(leftoverChunk);
        leftoverChunk = null;
      }
      if (isNodeStreamEnded) {
        controller.close(); // Signal EOF
      }
      return;
    }

    const view = byobRequest.view;
    if (!view) return;

    if (!leftoverChunk) {
      if (isNodeStreamEnded) {
        controller.close(); // Signal EOF
        byobRequest.respond(0); // Cancel BYOB request
      }
      return;
    }

    const bytesToCopy = Math.min(view.byteLength, leftoverChunk.length);
    new Uint8Array(view.buffer, view.byteOffset, bytesToCopy).set(
      leftoverChunk.subarray(0, bytesToCopy)
    );

    byobRequest.respond(bytesToCopy);

    leftoverChunk = bytesToCopy < leftoverChunk.length
      ? leftoverChunk.subarray(bytesToCopy)
      : null;

    if (!leftoverChunk && isNodeStreamEnded) {
      controller.close(); // Signal EOF
      byobRequest.respond(0); // Cancel BYOB request
    }
  };

  nodeReadable.pause(); // Start in pause mode

  return new ReadableStream({
    type: 'bytes',
    start(controller: ReadableByteStreamController) {
      nodeReadable.on('data', chunk => {
        leftoverChunk = leftoverChunk
          ? new Uint8Array([...leftoverChunk, ...chunk])
          : new Uint8Array(chunk);
        processLeftover(controller);
        if (!nodeReadable.isPaused()) {
          if (controller.desiredSize === null) {
            // BYOB Request backpressure
            if (leftoverChunk && leftoverChunk.length > highWaterMark && !nodeReadable.isPaused()) {
              nodeReadable.pause(); // Apply back pressure
            }
          } else {
            // Default request backpressure
            if (controller.desiredSize <= 0) {
              nodeReadable.pause(); // Start in pause mode
            }
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
      processLeftover(controller);
      if (nodeReadable.isPaused()) {
        nodeReadable.resume();
      }
    },
    cancel(reason) {
      nodeReadable.destroy(reason);
    },
  });
}
