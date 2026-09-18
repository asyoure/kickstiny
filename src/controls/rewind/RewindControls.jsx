import React, { useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import PlaybackSpeedButton from "./PlaybackSpeedButton.jsx";

function timestamp(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = String(Math.floor(total / 60) % 60).padStart(2, "0");
  return `${hours}:${minutes}:${String(total % 60).padStart(2, "0")}`;
}

export default function RewindControls({
  timeline,
  error,
  seek,
  setPlaybackRate,
  container,
  shouldShow,
}) {
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  if (!timeline || timeline.end <= 0) return null;

  const position = dragging
    ? (preview ?? timeline.position)
    : timeline.position;
  return (
    <div className="rewind-controls">
      {error ? (
        <span className="rewind-controls__error" role="status">
          {error}
        </span>
      ) : (
        <>
          <Slider.Root
            className="slider rewind-controls__slider"
            min={0}
            max={timeline.end}
            step={1}
            value={[Math.min(position, timeline.end)]}
            onPointerDownCapture={() => {
              setPreview(null);
              setDragging(true);
            }}
            onPointerUp={() => setDragging(false)}
            onValueChange={([value]) => setPreview(value)}
            onValueCommit={([value]) => {
              seek(value);
              setDragging(false);
            }}
            onPointerCancel={() => {
              setDragging(false);
              setPreview(null);
            }}
          >
            <Slider.Track className="slider__track">
              <Slider.Range className="slider__range" />
            </Slider.Track>
            <Slider.Thumb
              className="slider__thumb"
              aria-label="Rewind current broadcast"
              aria-valuetext={`${timestamp(position)} of ${timestamp(timeline.end)}`}
            >
              {dragging && (
                <span className="rewind-controls__preview" aria-hidden="true">
                  {timestamp(position)}
                </span>
              )}
            </Slider.Thumb>
          </Slider.Root>
          <span className="rewind-controls__time">{timestamp(position)}</span>
        </>
      )}
      <span className="rewind-controls__speed">
        {timeline.rewound && !error && (
          <PlaybackSpeedButton
            onChange={setPlaybackRate}
            container={container}
            shouldShow={shouldShow}
          />
        )}
      </span>
    </div>
  );
}
