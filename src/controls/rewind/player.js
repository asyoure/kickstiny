// How close to the end of the recording counts as caught up with live.
const LIVE_EDGE = 2;

// Timeline step in seconds, for arrow keys and dragging. It must exceed
// 2 × LIVE_EDGE: the slider snaps to this grid, so one step back from live can
// land as little as half a step behind, which must still be outside LIVE_EDGE.
export const SEEK_STEP = 5;

// The slider snaps every value, including its max, to the step grid. Rounding
// the max up keeps "dragged all the way right" at or past the end, which seek()
// clamps and treats as live, instead of snapping it up to 2.5s short.
export function timelineMax(end) {
  return Math.ceil(end / SEEK_STEP) * SEEK_STEP;
}

// IVS uses this large finite duration for media whose length is not known yet.
export function recordingDuration(duration) {
  return Number.isFinite(duration) && duration > 0 && duration < 2 ** 30
    ? duration
    : null;
}

export function createRewindPlayer(core, source, reloadLive, onError) {
  const emitter = core.emitter.emitter;
  let originalEnded;
  let rewound = false;
  let returningLive = false;

  const goLive = () => {
    if (returningLive) return;
    returningLive = true;
    core.setPlaybackRate(1);
    reloadLive();
  };
  const handleError = () => {
    onError("Recording unavailable.");
  };

  return {
    get rewound() {
      return rewound;
    },
    goLive,
    setPlaybackRate(rate) {
      if (rewound && !returningLive) core.setPlaybackRate(rate);
    },
    checkCatchUp() {
      if (
        !rewound ||
        core.isSeeking() ||
        core.isPaused() ||
        core.getState() !== "Playing"
      )
        return;
      const duration = recordingDuration(core.getDuration());
      if (duration !== null && core.getPosition() >= duration - LIVE_EDGE)
        goLive();
    },
    // Returns whether playback moved to a point in the recording.
    seek(seconds, end) {
      const wasPaused = core.isPaused();
      const duration = rewound ? recordingDuration(core.getDuration()) : null;
      const last = duration ?? end;
      const target = Math.max(0, Math.min(seconds, last));
      if (!Number.isFinite(target)) return false;

      // Seeking to the very end can restart the recording (seen on iOS), and
      // dragging all the way right means "go to live" anyway.
      if (target >= last - LIVE_EDGE) {
        if (rewound) goLive();
        return false;
      }

      onError(null);
      if (!rewound) {
        // Kick treats Ended as the channel going offline. Take over only when
        // switching to the recording, whose end should return to live instead.
        originalEnded = emitter.rawListeners("Ended");
        originalEnded.forEach((listener) =>
          core.removeEventListener("Ended", listener),
        );
        core.addEventListener("Ended", goLive);
        core.addEventListener("PlayerError", handleError);
        rewound = true;
        core.load(source);
      }
      core.seekTo(target);
      if (!wasPaused) core.play();
      return true;
    },
    dispose() {
      if (!rewound) return;
      core.removeEventListener("Ended", goLive);
      core.removeEventListener("PlayerError", handleError);
      originalEnded.forEach((listener) =>
        core.addEventListener("Ended", listener),
      );
    },
  };
}
