import assert from "node:assert/strict";
import test from "node:test";

import {
  CameraResourceLease,
  stopMediaStream,
} from "../src/components/customizer/camera-lifecycle.ts";

function fakeStream(trackCount = 1) {
  const tracks = Array.from({ length: trackCount }, () => ({
    stopCalls: 0,
    stop() {
      this.stopCalls += 1;
    },
  }));
  return { stream: { getTracks: () => tracks }, tracks };
}

test("stops every media track", () => {
  const { stream, tracks } = fakeStream(2);
  stopMediaStream(stream);
  assert.deepEqual(
    tracks.map((track) => track.stopCalls),
    [1, 1],
  );
});

test("disposes resources adopted before cancellation", () => {
  const lease = new CameraResourceLease();
  const { stream, tracks } = fakeStream(2);
  const model = {
    closeCalls: 0,
    close() {
      this.closeCalls += 1;
    },
  };

  assert.equal(lease.adoptStream(stream), true);
  assert.equal(lease.adoptModel(model), true);
  lease.cancel();
  lease.cancel();

  assert.deepEqual(
    tracks.map((track) => track.stopCalls),
    [1, 1],
  );
  assert.equal(model.closeCalls, 1);
});

test("immediately disposes camera and model promises that resolve after close", () => {
  const lease = new CameraResourceLease();
  lease.cancel();

  const { stream, tracks } = fakeStream();
  const model = {
    closeCalls: 0,
    close() {
      this.closeCalls += 1;
    },
  };
  assert.equal(lease.adoptStream(stream), false);
  assert.equal(lease.adoptModel(model), false);

  assert.equal(tracks[0].stopCalls, 1);
  assert.equal(model.closeCalls, 1);
});
