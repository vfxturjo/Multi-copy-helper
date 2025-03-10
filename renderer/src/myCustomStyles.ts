export function applyFadeOutTransition(
  element: HTMLElement,
  options?: {
    fadeOutTime?: number;
    timeoutTime?: number;
    stylingClass?: string;
    removeClass?: string[] | null;
  },
) {
  const {
    fadeOutTime = 1000,
    timeoutTime = 100,
    stylingClass = "bg-red-500",
    removeClass = null,
  } = options || {};

  console.log(
    "fadeTime",
    fadeOutTime,
    "timeoutTime",
    timeoutTime,
    "stylingClass",
    stylingClass,
    "removeClass",
    removeClass,
  );

  // Remove any conflicting classes if specified
  if (removeClass) {
    element.classList.remove(...removeClass);
  }

  // Remove duration class to ensure instant color change
  // any class starting with "duration-" will be removed
  element.classList.remove(
    ...Array.from(element.classList).filter((className: string) =>
      className.startsWith("duration-"),
    ),
  );

  // Add styling class and duration-0 for instant application of style
  element.classList.add(stylingClass, "duration-0");
  element.style.transitionDuration = "0ms"; // Set transition duration

  // Set timeout to trigger fade-out effect and revert classes
  setTimeout(() => {
    element.classList.remove("duration-0");
    element.style.transitionDuration = fadeOutTime + "ms"; // Set transition duration
    element.classList.remove(stylingClass);

    // Re-add the removed conflicting classes
    if (removeClass) {
      element.classList.add(...removeClass);
    }
  }, timeoutTime);
}
