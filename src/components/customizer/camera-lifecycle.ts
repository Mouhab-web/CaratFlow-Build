export type ClosableCameraModel = {
  close: () => void;
};

function safelyClose(model: ClosableCameraModel | null) {
  if (!model) return;
  try {
    model.close();
  } catch {
    // Cleanup must remain best-effort and idempotent.
  }
}

export function stopMediaStream(stream: MediaStream | null) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // A track can already be ended by the browser or operating system.
    }
  }
}

/**
 * Owns camera resources that arrive from asynchronous permission/model calls.
 * If the UI is closed before a promise resolves, adopting the late resource
 * disposes it immediately instead of leaking a live camera track or model.
 */
export class CameraResourceLease<TModel extends ClosableCameraModel> {
  private active = true;
  private stream: MediaStream | null = null;
  private model: TModel | null = null;

  get isActive() {
    return this.active;
  }

  adoptStream(stream: MediaStream) {
    if (!this.active) {
      stopMediaStream(stream);
      return false;
    }
    stopMediaStream(this.stream);
    this.stream = stream;
    return true;
  }

  adoptModel(model: TModel) {
    if (!this.active) {
      safelyClose(model);
      return false;
    }
    safelyClose(this.model);
    this.model = model;
    return true;
  }

  cancel() {
    if (!this.active && !this.stream && !this.model) return;
    this.active = false;
    stopMediaStream(this.stream);
    safelyClose(this.model);
    this.stream = null;
    this.model = null;
  }
}
