import type { Readable } from 'node:stream';

// No import of ReadableStream or its types!
// They are assumed to be available as globals (make sure your tsconfig.json includes "dom" in "lib")

export function makeByteReadableStreamFromNodeReadable(nodeReadable: Readable): ReadableStream<Uint8Array> {
  let leftoverChunk: Uint8Array | null = null;
  let isNodeStreamEnded = false;
  const highWaterMark = 16 * 1024;

  // This function will process any leftover bytes
  const processLeftover = (controller: ReadableByteStreamController) => {
    const byobRequest = controller.byobRequest;
    if (!byobRequest) {
      if (leftoverChunk && leftoverChunk.length > 0) {
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

        // Apply backpressure if needed.
        if (!nodeReadable.isPaused()) {
          if (controller.desiredSize === null) {
            // BYOB Request backpressure
            if (leftoverChunk && leftoverChunk.length > highWaterMark && !nodeReadable.isPaused()) {
              nodeReadable.pause();
            }
          } else {
            // Default request backpressure
            if (controller.desiredSize <= 0) {
              nodeReadable.pause();
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
