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

import { RefObject, useCallback, useEffect, useRef, useState } from "react";

/** Was ein offenes Dropdown zeigt und woran es hängt. */
export interface DropdownRequest {
  /** Der Eintrag, dessen Pfeil (oder Ordner-Knopf) es geöffnet hat. */
  forId: string;
  /** Die Ebene, deren Kinder es zeigt. */
  levelId: string;
  /** Hervorgehoben (`aria-current="true"`), etwa der Startpunkt unter seinen Geschwistern. */
  markId: string | null;
  /** Name der Liste darin, derselbe wie der des Pfeils. */
  label: string;
  trigger: HTMLElement;
}

export interface Dropdown {
  open: DropdownRequest | null;
  /** Öffnet das Dropdown von `request.forId` — oder schließt es, wenn es schon offen ist. */
  toggle: (request: DropdownRequest) => void;
  /** Das Element des offenen Dropdowns; Klicks und Fokus darin halten es offen. */
  panelRef: RefObject<HTMLDivElement | null>;
}

const FOCUSABLE = "a[href], button:not([disabled])";

const focusables = (scope: Element): HTMLElement[] => Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE));

/**
 * Höchstens ein Dropdown zur Zeit. Es schließt bei Escape (der Fokus kehrt
 * auf den Auslöser zurück), bei einem Klick oder Fokus außerhalb, wenn die
 * Leiste wirklich scrollt und wenn das Fenster schmaler oder breiter wird —
 * die Lage unter dem Auslöser stimmte danach nicht mehr. Nicht aber, wenn
 * nur die Höhe wechselt: Telefone tun das, sobald die Adressleiste einklappt.
 *
 * Der Content Designer setzt jeden Block in einen eigenen Shadow Root; am
 * `document` trägt jedes Ereignis von dort den Wirt als Ziel. Wo es wirklich
 * herkommt, sagt nur `composedPath()`.
 *
 * Weil das Dropdown außerhalb des Scroll-Streifens steht, läge es in der
 * Tab-Reihenfolge hinter der ganzen Leiste. Deshalb führt Tab vom offenen
 * Auslöser hinein, Umschalt+Tab vom ersten Eintrag zurück und Tab vom letzten
 * Eintrag weiter zum Element, das in der Leiste auf den Auslöser folgt.
 */
export function useDropdown(rootRef: RefObject<HTMLElement | null>, scrollerRef: RefObject<HTMLElement | null>): Dropdown {
  const [open, setOpen] = useState<DropdownRequest | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback((request: DropdownRequest) => {
    setOpen((previous) => (previous?.forId === request.forId ? null : request));
  }, []);

  useEffect(() => {
    if (open === null) return;
    const close = (): void => setOpen(null);
    const inside = (event: Event): boolean =>
      event.composedPath().some((node) => node === open.trigger || node === panelRef.current);

    const onPointerDown = (event: Event): void => {
      if (!inside(event)) close();
    };
    const onFocusIn = (event: FocusEvent): void => {
      if (!inside(event)) close();
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        close();
        open.trigger.focus();
        return;
      }
      if (event.key === "Tab") moveFocus(event, open.trigger, panelRef.current, rootRef.current);
    };

    const openWidth = window.innerWidth;
    const onResize = (): void => {
      if (window.innerWidth !== openWidth) close();
    };
    // Ein Scroll-Ereignis ohne Bewegung (Scroll-Anker, Fokus auf einem schon
    // sichtbaren Eintrag) käme sonst gleich nach dem Öffnen und schlösse wieder.
    const scroller = scrollerRef.current;
    const openScrollLeft = scroller?.scrollLeft ?? 0;
    const onScroll = (): void => {
      if (scroller !== null && scroller.scrollLeft !== openScrollLeft) close();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    scroller?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      scroller?.removeEventListener("scroll", onScroll);
    };
  }, [open, rootRef, scrollerRef]);

  return { open, toggle, panelRef };
}

function moveFocus(event: KeyboardEvent, trigger: HTMLElement, panel: HTMLElement | null, root: HTMLElement | null): void {
  if (panel === null) return;
  const inPanel = focusables(panel);
  if (inPanel.length === 0) return;

  // Das eigentliche Ziel, auch hinter einem Shadow Root.
  const [target] = event.composedPath();
  let next: HTMLElement | undefined;
  if (target === trigger && !event.shiftKey) next = inPanel[0];
  else if (target === inPanel[0] && event.shiftKey) next = trigger;
  else if (target === inPanel[inPanel.length - 1] && !event.shiftKey && root !== null) {
    // Gibt es nach dem Auslöser nichts mehr, verlässt Tab die Leiste von selbst:
    // das Dropdown steht ganz am Ende.
    const inBar = focusables(root).filter((element) => !panel.contains(element));
    const index = inBar.indexOf(trigger);
    if (index >= 0) next = inBar[index + 1];
  }
  if (next === undefined) return;
  event.preventDefault();
  next.focus();
}
