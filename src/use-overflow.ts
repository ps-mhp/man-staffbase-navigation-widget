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

import { RefObject, useCallback, useLayoutEffect, useState } from "react";

/** Ein Klick auf ‹ oder › rückt um diesen Teil der sichtbaren Breite weiter. */
export const SCROLL_SHARE = 0.8;

/** Rundungsreste beim Zoomen sollen keinen Knopf freigeben. */
const TOLERANCE = 1;

export interface Overflow {
  /** Die Einträge sind breiter als der sichtbare Streifen. */
  overflowing: boolean;
  atStart: boolean;
  atEnd: boolean;
}

const NONE: Overflow = { overflowing: false, atStart: true, atEnd: true };

function measure(element: HTMLElement): Overflow {
  const { scrollLeft, scrollWidth, clientWidth } = element;
  if (scrollWidth <= clientWidth + TOLERANCE) return NONE;
  return {
    overflowing: true,
    atStart: scrollLeft <= TOLERANCE,
    atEnd: scrollLeft + clientWidth >= scrollWidth - TOLERANCE,
  };
}

const same = (a: Overflow, b: Overflow): boolean =>
  a.overflowing === b.overflowing && a.atStart === b.atStart && a.atEnd === b.atEnd;

/**
 * Ob ein waagerecht scrollender Streifen über seinen Rand hinausreicht, und
 * wie weit er gescrollt ist. Neu gemessen beim Scrollen, wenn sich Streifen
 * oder Inhalt in der Größe ändern, und wenn `contentKey` wechselt (die
 * Einträge sind geladen).
 *
 * Ohne `ResizeObserver` (alte WebViews) messen wenigstens die
 * Größenänderung des Fensters, der nächste Frame und das Ende des
 * Schriftladens neu — die Hausschrift ist breiter als ihr Ersatz.
 */
export function useOverflow(
  ref: RefObject<HTMLElement | null>,
  contentKey: unknown,
): [Overflow, (direction: -1 | 1) => void] {
  const [overflow, setOverflow] = useState<Overflow>(NONE);

  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) {
      setOverflow((previous) => (same(previous, NONE) ? previous : NONE));
      return;
    }
    const update = (): void => {
      const next = measure(element);
      setOverflow((previous) => (same(previous, next) ? previous : next));
    };
    update();

    element.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    observer?.observe(element);
    if (element.firstElementChild !== null) observer?.observe(element.firstElementChild);
    let alive = true;
    const frame = typeof requestAnimationFrame === "function" ? requestAnimationFrame(update) : null;
    void document.fonts?.ready.then(() => {
      if (alive) update();
    });

    return () => {
      alive = false;
      if (frame !== null) cancelAnimationFrame(frame);
      element.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer?.disconnect();
    };
  }, [ref, contentKey]);

  const scroll = useCallback(
    (direction: -1 | 1) => {
      const element = ref.current;
      if (element === null) return;
      const left = direction * element.clientWidth * SCROLL_SHARE;
      if (typeof element.scrollBy === "function") element.scrollBy({ left, behavior: "smooth" });
      else element.scrollLeft += left;
    },
    [ref],
  );

  return [overflow, scroll];
}
