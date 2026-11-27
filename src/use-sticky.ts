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

/**
 * „Sticky“: Erreicht die Leiste beim Scrollen die Unterkante der Kopfzeile
 * (Hauptmenü), bleibt sie darunter stehen – bis ans Ende der Seite
 * (Vorgabe 27.11.2026).
 *
 * Nicht mit `position: sticky`: das klebt nur innerhalb des Elternkastens,
 * und der ist hier der Abschnitt des Content Designers – die Leiste schöbe
 * sich mit dessen Ende wieder aus dem Bild. Stattdessen steht die Leiste
 * dann `position: fixed` unter der gemessenen Kopfzeile
 * (`measureChromeHeight`), und ein Platzhalter an ihrer Stelle hält ihre
 * Höhe, damit die Seite darunter nicht springt.
 *
 * Gerechnet wird synchron im Scroll-Ereignis, nicht im nächsten Bild: das
 * offene Dropdown legt sich im selben Ereignis unter die Leiste
 * (`menu-dropdown.tsx`) und muss ihre neue Lage schon sehen. Der Hook hängt
 * sich beim Einhängen der Leiste an, also vor jedem Dropdown.
 *
 * Steht ein Vorfahre mit `transform`, `filter` oder `contain`, ist er statt
 * des Fensters der Bezugskasten für `fixed`. Der Versatz wird beim Ankleben
 * einmal gemessen und herausgerechnet.
 *
 * Im Studio bleibt die Leiste im Fluss: dort rollt die Leinwand unter der
 * Werkzeugleiste des Studios, die keine Kopfzeile der Seite ist.
 */

import { RefObject, useEffect } from "react";

import { measureChromeHeight } from "@shared/staffbase-chrome";

/** Die Klasse der angeklebten Leiste (`styles/navigation-menu.scss`). */
export const STUCK_CLASS = "man-nav--stuck";

const STUDIO_PATH = /^\/studio(\/|$)/;

/** Ob die Leiste ankleben soll: sobald ihr Platz unter die Kopfzeile rückt. */
export function shouldStick(placeholderTop: number, chromeBottom: number): boolean {
  return placeholderTop < chromeBottom;
}

interface Offset {
  x: number;
  y: number;
}

const STYLED = ["top", "left", "width"] as const;

function release(placeholder: HTMLElement, bar: HTMLElement): void {
  bar.classList.remove(STUCK_CLASS);
  for (const property of STYLED) bar.style.removeProperty(property);
  placeholder.style.removeProperty("height");
}

function place(bar: HTMLElement, top: number, left: number, width: number, offset: Offset): void {
  bar.style.top = `${top - offset.y}px`;
  bar.style.left = `${left - offset.x}px`;
  bar.style.width = `${width}px`;
}

/**
 * Lässt `bar` beim Scrollen unter der Kopfzeile stehen; `placeholder` ist
 * der Kasten an ihrer Stelle im Fluss.
 *
 * @param enabled falsch, wenn die Redaktion „Sticky“ ausgeschaltet hat, und
 * in der Vorschau des Fensters „Startpunkt wählen“.
 */
export function useSticky(
  placeholderRef: RefObject<HTMLElement | null>,
  barRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): void {
  useEffect(() => {
    const placeholder = placeholderRef.current;
    const bar = barRef.current;
    if (!enabled || placeholder === null || bar === null) return undefined;
    if (STUDIO_PATH.test(window.location.pathname)) return undefined;

    let offset: Offset | null = null;

    const update = (): void => {
      const slot = placeholder.getBoundingClientRect();
      const chrome = measureChromeHeight();
      // Ein ausgeblendeter Block (Breite 0) klebt nicht.
      if (slot.width === 0 || !shouldStick(slot.top, chrome)) {
        if (offset !== null) release(placeholder, bar);
        offset = null;
        return;
      }
      if (offset === null) {
        placeholder.style.height = `${slot.height}px`;
        bar.classList.add(STUCK_CLASS);
        place(bar, chrome, slot.left, slot.width, { x: 0, y: 0 });
        const actual = bar.getBoundingClientRect();
        offset = { x: actual.left - slot.left, y: actual.top - chrome };
      } else {
        placeholder.style.height = `${bar.offsetHeight}px`;
      }
      place(bar, chrome, slot.left, slot.width, offset);
    };

    // Ändert sich die Fensterbreite, kann sich auch der Bezugskasten verschoben haben.
    const remeasure = (): void => {
      if (offset !== null) release(placeholder, bar);
      offset = null;
      update();
    };

    update();
    window.addEventListener("scroll", update, { capture: true, passive: true });
    window.addEventListener("resize", remeasure);
    return () => {
      window.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", remeasure);
      release(placeholder, bar);
    };
  }, [placeholderRef, barRef, enabled]);
}
