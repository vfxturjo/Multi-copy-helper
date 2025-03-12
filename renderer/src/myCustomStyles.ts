export function applyFadeOutTransition(
  element: HTMLElement,
  options?: {
    fadeOutTime?: number;
    timeoutTime?: number;
    stylingClass?: string[] | string;
    removeClass?: string[] | string | null;
    startDelay?: number;
  },
) {
  const { fadeOutTime = 1000, timeoutTime = 100 } = options || {};
  let { stylingClass = "bg-red-500", removeClass = null } = options || {};

  // if stylingClass or removeClass is a string, convert it to an array
  if (typeof stylingClass === "string") {
    stylingClass = [stylingClass];
  }
  if (typeof removeClass === "string") {
    removeClass = [removeClass];
  }

  // if delay is added, do everything with a timeout
  if (options?.startDelay) {
    setTimeout(() => {
      applyFadeOutTransition(element, {
        fadeOutTime,
        timeoutTime,
        stylingClass,
        removeClass,
      });
    }, options.startDelay);
    return;
  }

  // Remove any conflicting classes if specified
  if (removeClass) {
    element.classList.remove(...removeClass);
  }
  // get initial transition duration
  const transitionDurationOrig = getComputedStyle(element).getPropertyValue("transition-duration");

  // Remove duration class to ensure instant color change
  // any class starting with "duration-" will be removed
  element.classList.remove(
    ...Array.from(element.classList).filter((className: string) =>
      className.startsWith("duration-"),
    ),
  );

  element.classList.add(...stylingClass, "duration-0");
  element.style.transitionDuration = "0ms"; // Set transition duration

  // Set timeout to trigger fade-out effect and revert classes
  setTimeout(() => {
    element.classList.remove("duration-0");
    element.style.transitionDuration = fadeOutTime + "ms"; // Set transition duration
    element.classList.remove(...stylingClass);

    // Re-add the removed conflicting classes
    if (removeClass) {
      element.classList.add(...removeClass);
    }
  }, timeoutTime);

  // Set transition duration back to original value
  setTimeout(() => {
    element.style.transitionDuration = transitionDurationOrig;
  }, fadeOutTime + timeoutTime);
}
