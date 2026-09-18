import React, { useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tooltip from "@radix-ui/react-tooltip";
import clsx from "clsx";
import Button from "../../components/Button.jsx";
import ControlsTooltip from "../ControlsTooltip.jsx";

export default function PlaybackSpeedButton({
  onChange,
  container,
  shouldShow,
}) {
  const [rate, setRate] = useState("1");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!shouldShow) setOpen(false);
  }, [shouldShow]);

  return (
    <Tooltip.Root>
      <DropdownMenu.Root modal={false} open={open} onOpenChange={setOpen}>
        <Tooltip.Trigger asChild>
          <DropdownMenu.Trigger asChild>
            <Button variant="tertiary" iconOnly aria-label="Playback Speed">
              {/* Kick's PlaybackSpeed icon. */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M5.43 4.25a.8.8 0 0 0 1 .13 7 7 0 0 1 2.12-.88.8.8 0 0 0 .62-.8c0-.53-.5-.94-1.01-.82q-1.42.31-2.6 1.08a.83.83 0 0 0-.13 1.29m-1.93 7.2a.8.8 0 0 0-.8-.62c-.53 0-.93.5-.82 1.01q.33 1.42 1.09 2.6c.28.45.91.51 1.29.13a.8.8 0 0 0 .12-1.01 7 7 0 0 1-.87-2.12zm-.55-5.9q-.76 1.2-1.08 2.6c-.12.52.29 1 .81 1a.8.8 0 0 0 .8-.6q.34-1.48 1.24-2.64l-.5-.5a.83.83 0 0 0-1.29.13zm8.9-3.67a.84.84 0 0 0-1.02.81c0 .39.25.73.62.81a6.68 6.68 0 0 1-.37 13.08 6.6 6.6 0 0 1-4.64-.95.8.8 0 0 0-1.02.13.84.84 0 0 0 .14 1.3 8.35 8.35 0 1 0 6.3-15.18"
                />
                <path
                  fill="currentColor"
                  d="M7.18 11.98a.83.83 0 0 0 1.21.74l3.97-1.98a.83.83 0 0 0 0-1.49L8.39 7.27A.83.83 0 0 0 7.2 8z"
                />
              </svg>
            </Button>
          </DropdownMenu.Trigger>
        </Tooltip.Trigger>
        {!open && (
          <Tooltip.Portal>
            <ControlsTooltip>Playback Speed</ControlsTooltip>
          </Tooltip.Portal>
        )}
        <DropdownMenu.Portal container={container}>
          <DropdownMenu.Content
            className="settings-dropdown dropdown"
            side="top"
            align="end"
            sideOffset={8}
            collisionPadding={8}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <DropdownMenu.RadioGroup
              value={rate}
              onValueChange={(value) => {
                onChange(Number(value));
                setRate(value);
              }}
            >
              {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((value) => (
                <DropdownMenu.RadioItem
                  key={value}
                  value={String(value)}
                  className={clsx(
                    "dropdown__item",
                    rate === String(value) && "dropdown__item--active",
                  )}
                >
                  {value === 1 ? "Normal (1×)" : `${value}×`}
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </Tooltip.Root>
  );
}
