import { useEffect, useState, useRef, useCallback } from "react";

export function useControlsVisibility(containerRef, controlsBarRef) {
  const [isHovered, setIsHovered] = useState(false);
  const [isHoveringControls, setIsHoveringControls] = useState(false);
  const [isInactive, setIsInactive] = useState(false);
  const inactivityTimeoutRef = useRef(null);
  const isHoveredRef = useRef(false);
  const isHoveringControlsRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    isHoveredRef.current = isHovered;
  }, [isHovered]);

  useEffect(() => {
    isHoveringControlsRef.current = isHoveringControls;
  }, [isHoveringControls]);

  const startInactivityTimer = useCallback(() => {
    // Don't start timer if hovering over controls
    if (isHoveringControlsRef.current) {
      return;
    }

    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    inactivityTimeoutRef.current = setTimeout(() => {
      // Check current state when timeout fires
      if (isHoveringControlsRef.current) {
        return;
      }
      setIsInactive(true);
    }, 3000);
  }, []);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  }, []);

  // Track container hover
  useEffect(() => {
    if (!containerRef.current) return;

    const handleMouseEnter = () => {
      setIsHovered(true);
      setIsInactive(false);
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      setIsInactive(false);
      clearInactivityTimer();
    };

    const container = containerRef.current;
    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [clearInactivityTimer]);

  // Track controls bar hover
  useEffect(() => {
    if (!controlsBarRef.current) return;

    const handleControlsMouseEnter = () => {
      setIsHoveringControls(true);
      setIsInactive(false);
      clearInactivityTimer();
    };

    const handleControlsMouseLeave = () => {
      setIsHoveringControls(false);
      // Restart inactivity timer when leaving controls (if still hovering container)
      if (isHoveredRef.current) {
        startInactivityTimer();
      }
    };

    // Touch drags fire no mouse events, so treat pointer contact with the bar
    // as activity and only restart the inactivity timer once it ends.
    const handleControlsPointerDown = () => {
      setIsInactive(false);
      clearInactivityTimer();
    };

    const handleControlsPointerUp = () => {
      startInactivityTimer();
    };

    const controlsBar = controlsBarRef.current;
    controlsBar.addEventListener("mouseenter", handleControlsMouseEnter);
    controlsBar.addEventListener("mouseleave", handleControlsMouseLeave);
    controlsBar.addEventListener("pointerdown", handleControlsPointerDown);
    controlsBar.addEventListener("pointerup", handleControlsPointerUp);
    controlsBar.addEventListener("pointercancel", handleControlsPointerUp);

    return () => {
      controlsBar.removeEventListener("mouseenter", handleControlsMouseEnter);
      controlsBar.removeEventListener("mouseleave", handleControlsMouseLeave);
      controlsBar.removeEventListener("pointerdown", handleControlsPointerDown);
      controlsBar.removeEventListener("pointerup", handleControlsPointerUp);
      controlsBar.removeEventListener("pointercancel", handleControlsPointerUp);
    };
  }, [startInactivityTimer, clearInactivityTimer]);

  // Track mouse movement for inactivity
  useEffect(() => {
    if (!containerRef.current) return;

    const handleMouseMove = (e) => {
      const isOverContainer = containerRef.current.contains(e.target);
      const isOverControls =
        controlsBarRef.current && controlsBarRef.current.contains(e.target);

      // If mouse is over container but isHovered is false, set it to true
      // This handles the case where mouse was already over container on page load
      if (!isHoveredRef.current && isOverContainer) {
        setIsHovered(true);
        setIsInactive(false);
      }

      // Don't reset timeout if mouse is over controls bar
      if (isOverControls) {
        return;
      }

      setIsInactive(false);
      startInactivityTimer();
    };

    const container = containerRef.current;
    container.addEventListener("mousemove", handleMouseMove);

    // Set initial timeout if hovered
    if (isHovered) {
      startInactivityTimer();
    }

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      clearInactivityTimer();
    };
  }, [isHovered, startInactivityTimer, clearInactivityTimer]);

  const showControls = useCallback(() => {
    setIsHovered(true);
    setIsInactive(false);
    clearInactivityTimer();
    startInactivityTimer();
  }, [clearInactivityTimer, startInactivityTimer]);

  // Calculate visibility
  // Show only when hovering over video AND (hovering over controls OR not inactive)
  const shouldShow = isHovered && (isHoveringControls || !isInactive);

  // Hide cursor when controls are hidden (hovering over video but inactive)
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const shouldHideCursor = isHovered && !shouldShow;

    if (shouldHideCursor) {
      container.style.cursor = "none";
    } else {
      container.style.cursor = "";
    }

    return () => {
      container.style.cursor = "";
    };
  }, [isHovered, shouldShow]);

  return { shouldShow, showControls };
}
