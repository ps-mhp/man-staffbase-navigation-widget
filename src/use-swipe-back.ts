/*!
 * Copyright 2026, MHP Management und IT-Beratung GmbH and contributors.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { RefObject, useEffect, useRef } from "react";

/** Ab so vielen Pixeln nach rechts gilt die Geste als „zurück“. */
export const SWIPE_THRESHOLD = 60;

/**
 * Ab dieser Strecke steht fest, ob der Finger quer oder längs zieht. Vorher
 * entscheidet nichts — sonst kippte jedes leichte Zittern beim Scrollen die
 * Ebene.
 */
export const SWIPE_DECIDE_DISTANCE = 10;

/** Die Variable, über die das Stylesheet die Ebene dem Finger folgen lässt. */
export const DRAG_PROPERTY = "--man-nav-drag";

/** Gesetzt, solange der Finger die Ebene zieht — schaltet den Übergang ab. */
export const DRAGGING_CLASS = "man-nav--dragging";

interface Gesture {
  x: number;
  y: number;
  axis: "undecided" | "horizontal" | "vertical";
}

/**
 * Zurückblättern per Wischen nach rechts, wie in den Menüs eines Telefons.
 *
 * Nur Touch: mit der Maus zieht niemand eine Liste beiseite, und Tastatur und
 * Zeiger haben den Zurück-Knopf. Längs gezogen bleibt alles beim Browser —
 * die Seite scrollt wie gewohnt; erst ein Zug, der klar quer und nach rechts
 * geht, gehört dem Widget. Während des Zugs folgt die Ebene dem Finger über
 * {@link DRAG_PROPERTY}, ohne dass React dafür rendert.
 */
export function useSwipeBack(ref: RefObject<HTMLElement | null>, enabled: boolean, onBack: () => void): void {
  // Immer der jüngste Rückruf, ohne die Listener bei jedem Rendern neu zu setzen.
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    const element = ref.current;
    if (element === null || !enabled) return;

    let gesture: Gesture | null = null;

    const reset = (): void => {
      gesture = null;
      element.style.removeProperty(DRAG_PROPERTY);
      element.classList.remove(DRAGGING_CLASS);
    };

    const handleStart = (event: TouchEvent): void => {
      const touch = event.touches.length === 1 ? event.touches[0] : undefined;
      // Ein zweiter Finger beendet einen laufenden Zug, samt Versatz.
      if (touch === undefined) {
        reset();
        return;
      }
      gesture = { x: touch.clientX, y: touch.clientY, axis: "undecided" };
    };

    const handleMove = (event: TouchEvent): void => {
      if (gesture === null) return;
      const touch = event.touches[0];
      if (event.touches.length !== 1 || touch === undefined) {
        reset();
        return;
      }
      const dx = touch.clientX - gesture.x;
      const dy = touch.clientY - gesture.y;

      if (gesture.axis === "undecided") {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_DECIDE_DISTANCE) return;
        gesture.axis = dx > 0 && Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
        if (gesture.axis === "horizontal") element.classList.add(DRAGGING_CLASS);
      }
      if (gesture.axis !== "horizontal") return;

      // Die Seite soll unter dem Finger nicht mitwandern.
      if (event.cancelable) event.preventDefault();
      element.style.setProperty(DRAG_PROPERTY, `${Math.max(0, dx)}px`);
    };

    const handleEnd = (event: TouchEvent): void => {
      const current = gesture;
      const touch = event.changedTouches[0];
      reset();
      if (current?.axis !== "horizontal" || touch === undefined) return;
      if (touch.clientX - current.x >= SWIPE_THRESHOLD) onBackRef.current();
    };

    element.addEventListener("touchstart", handleStart, { passive: true });
    // Nicht passiv: nur so darf `handleMove` das Mitscrollen verhindern.
    element.addEventListener("touchmove", handleMove, { passive: false });
    element.addEventListener("touchend", handleEnd);
    element.addEventListener("touchcancel", reset);
    return () => {
      element.removeEventListener("touchstart", handleStart);
      element.removeEventListener("touchmove", handleMove);
      element.removeEventListener("touchend", handleEnd);
      element.removeEventListener("touchcancel", reset);
      reset();
    };
  }, [ref, enabled]);
}
