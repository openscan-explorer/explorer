import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface HelperTooltipProps {
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
  className?: string;
}

const HOVER_DELAY_MS = 350;

const HelperTooltip: React.FC<HelperTooltipProps> = ({ content, placement = "top", className }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPlacement, setActualPlacement] = useState(placement);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const tooltipId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPointerInsideRef = useRef(false);

  const show = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Only auto-flip top↔bottom; left/right stay as requested
      if (placement === "top" || placement === "bottom") {
        setActualPlacement(rect.top < 80 ? "bottom" : placement);
      } else {
        setActualPlacement(placement);
      }
      setTriggerRect(rect);
    }
    setIsVisible(true);
  }, [placement]);

  const hide = useCallback(() => {
    setIsVisible(false);
  }, []);

  const clearHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const handlePointerEnter = useCallback(() => {
    isPointerInsideRef.current = true;
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(show, HOVER_DELAY_MS);
  }, [show, clearHoverTimeout]);

  const handlePointerLeave = useCallback(() => {
    isPointerInsideRef.current = false;
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isPointerInsideRef.current) {
        hide();
      }
    }, 100);
  }, [hide, clearHoverTimeout]);

  const handleFocus = useCallback(() => {
    show();
  }, [show]);

  const handleBlur = useCallback(() => {
    hide();
  }, [hide]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        hide();
      }
    },
    [hide],
  );

  const handleClick = useCallback(() => {
    if (isVisible) {
      hide();
    } else {
      show();
    }
  }, [isVisible, show, hide]);

  // Close on outside click
  useEffect(() => {
    if (!isVisible) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        bubbleRef.current &&
        !bubbleRef.current.contains(target)
      ) {
        hide();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isVisible, hide]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Clamp bubble within viewport and position arrow after render
  useLayoutEffect(() => {
    if (!isVisible || !bubbleRef.current || !triggerRect) return;
    const bubble = bubbleRef.current;
    const arrow = arrowRef.current;
    const rect = bubble.getBoundingClientRect();
    const margin = 8;
    let needsClamp = false;
    let left = rect.left;
    let top = rect.top;

    // Horizontal clamping
    if (rect.right > window.innerWidth - margin) {
      left = window.innerWidth - margin - rect.width;
      needsClamp = true;
    } else if (rect.left < margin) {
      left = margin;
      needsClamp = true;
    }

    // Vertical clamping
    if (rect.bottom > window.innerHeight - margin) {
      top = window.innerHeight - margin - rect.height;
      needsClamp = true;
    } else if (rect.top < margin) {
      top = margin;
      needsClamp = true;
    }

    if (needsClamp) {
      bubble.style.left = `${left}px`;
      bubble.style.top = `${top}px`;
      bubble.style.transform = "none";
    }

    // Position arrow to point at trigger center
    if (arrow) {
      const bubbleRect = bubble.getBoundingClientRect();
      const triggerCenterX = triggerRect.left + triggerRect.width / 2;
      const triggerCenterY = triggerRect.top + triggerRect.height / 2;
      const arrowSize = 5;

      if (actualPlacement === "top" || actualPlacement === "bottom") {
        const arrowLeft = Math.max(
          arrowSize,
          Math.min(triggerCenterX - bubbleRect.left, bubbleRect.width - arrowSize),
        );
        arrow.style.left = `${arrowLeft}px`;
      } else {
        const arrowTop = Math.max(
          arrowSize,
          Math.min(triggerCenterY - bubbleRect.top, bubbleRect.height - arrowSize),
        );
        arrow.style.top = `${arrowTop}px`;
      }
    }
  }, [isVisible, triggerRect, actualPlacement]);

  const getBubbleStyle = (): React.CSSProperties => {
    if (!triggerRect) return {};
    const gap = 6;
    const centerX = triggerRect.left + triggerRect.width / 2;
    const centerY = triggerRect.top + triggerRect.height / 2;

    switch (actualPlacement) {
      case "bottom":
        return {
          position: "fixed",
          top: triggerRect.bottom + gap,
          left: centerX,
          transform: "translateX(-50%)",
        };
      case "left":
        return {
          position: "fixed",
          top: centerY,
          left: triggerRect.left - gap,
          transform: "translate(-100%, -50%)",
        };
      case "right":
        return {
          position: "fixed",
          top: centerY,
          left: triggerRect.right + gap,
          transform: "translateY(-50%)",
        };
      default:
        return {
          position: "fixed",
          top: triggerRect.top - gap,
          left: centerX,
          transform: "translate(-50%, -100%)",
        };
    }
  };

  const bubble = isVisible ? (
    <div
      ref={bubbleRef}
      id={tooltipId}
      role="tooltip"
      className="helper-tooltip-bubble"
      style={getBubbleStyle()}
      onMouseEnter={handlePointerEnter}
      onMouseLeave={handlePointerLeave}
    >
      {content}
      <span
        ref={arrowRef}
        className={`helper-tooltip-arrow helper-tooltip-arrow-${actualPlacement}`}
        aria-hidden="true"
      />
    </div>
  ) : null;

  return (
    <span className={`helper-tooltip ${className ?? ""}`}>
      <button
        ref={triggerRef}
        type="button"
        className="helper-tooltip-trigger"
        aria-label="More info"
        aria-describedby={isVisible ? tooltipId : undefined}
        onMouseEnter={handlePointerEnter}
        onMouseLeave={handlePointerLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <text
            x="8"
            y="12"
            textAnchor="middle"
            fill="currentColor"
            fontSize="10"
            fontWeight="600"
            fontFamily="inherit"
          >
            ?
          </text>
        </svg>
      </button>
      {bubble && createPortal(bubble, document.body)}
    </span>
  );
};

export default HelperTooltip;
