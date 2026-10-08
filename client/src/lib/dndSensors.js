import { MouseSensor, TouchSensor } from "@dnd-kit/core";

const BLOCKED_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT", "OPTION"]);

// Walks up from the pressed element. Returns false if it is (or is inside) something that must not start a drag.
function canStartDrag(target) {
  let el = target;
  while (el && el !== document.body) {
    if (el.dataset && el.dataset.noDnd !== undefined) return false;
    if (BLOCKED_TAGS.has(el.tagName) || el.isContentEditable) return false;
    el = el.parentElement;
  }
  return true;
}

export class SmartMouseSensor extends MouseSensor {
  static activators = [
    {
      eventName: "onMouseDown",
      handler: ({ nativeEvent: event }, { onActivation }) => {
        if (event.button !== 0 || !canStartDrag(event.target)) return false;
        onActivation?.({ event });
        return true;
      },
    },
  ];
}

export class SmartTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart",
      handler: ({ nativeEvent: event }, { onActivation }) => {
        if (event.touches.length > 1 || !canStartDrag(event.target))
          return false;
        onActivation?.({ event });
        return true;
      },
    },
  ];
}
