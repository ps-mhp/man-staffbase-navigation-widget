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

import { RefObject, useLayoutEffect, useState } from "react";

/**
 * Unter dieser Breite (in px) steht die Leiste in zwei Zeilen: oben der
 * Startpunkt, darunter ein Dropdown mit seinen Unterpunkten statt des
 * waagerecht scrollenden Streifens (Vorgabe 27.11.2026, „auf Mobile“).
 * Gemessen wird der Platz des Widgets, nicht das Fenster — eine schmale
 * Spalte auf dem Desktop ist so eng wie ein Telefon.
 */
export const COMPACT_BELOW = 600;

/**
 * Ob `ref` schmaler als {@link COMPACT_BELOW} ist. Eine Breite von 0 heißt
 * „noch nicht gemessen“ (versteckt, jsdom) und zählt nicht als schmal.
 */
export function useCompact(ref: RefObject<HTMLElement | null>): boolean {
  const [compact, setCompact] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) return undefined;
    const update = (): void => {
      const width = element.getBoundingClientRect().width;
      setCompact(width > 0 && width < COMPACT_BELOW);
    };
    update();

    window.addEventListener("resize", update);
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    observer?.observe(element);
    return () => {
      window.removeEventListener("resize", update);
      observer?.disconnect();
    };
  }, [ref]);

  return compact;
}
