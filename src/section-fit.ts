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
 * Ein Abschnitt, in dem nur die Leiste steht, ist so hoch wie sie und etwas
 * Luft (Vorgabe 06.11.2026).
 *
 * Der Content Designer stapelt um jeden Block Abstände, die ihm gehören —
 * gemessen 06.11.2026 auf truck (`6aec5e8f…`): Rahmen 40px oben und unten,
 * `mb-6` am Container 32px, Abschnitt unten 24px (`--man-designer-section-gap`
 * aus man-theme, mit `!important`). Um eine 44px hohe Leiste standen so 180px.
 *
 * Steht die Leiste allein in ihrem Abschnitt, fallen diese Abstände; nur der
 * Rahmen behält oben und unten `FRAME_AIR`. Teilt sie den Abschnitt mit
 * anderen Blöcken, bleibt alles, wie die Seite es vorsieht. Im klassischen
 * Editor gibt es keinen Abschnitt, also auch keinen Eingriff.
 *
 * Der Block steckt hinter Schattengrenzen mit Attrappen der Vorfahren
 * (`custom-block.mjs` ab 10.0.12); die Suche steigt über die Wirte hinweg
 * und überspringt die Attrappen.
 */

import { RefObject, useEffect } from "react";

/** Was oben und unten im Rahmen bleibt: `man("space-4")`. */
export const FRAME_AIR = "16px";

const SECTION_BLOCK = '[data-c13y-component="section-block"]';
const ANCESTOR_COPY = "[data-sb-c13y-ancestor-copy]";

/** Elemente, die nie einen Kasten neben der Leiste aufspannen. */
const NOT_RENDERED = new Set(["STYLE", "LINK", "SCRIPT", "TEMPLATE", "META"]);

type Edge = "padding-top" | "padding-bottom" | "margin-top" | "margin-bottom";

/** Der Elternknoten, auch über eine Schattengrenze hinweg. */
function parentAcross(node: Element): HTMLElement | null {
  if (node.parentElement !== null) return node.parentElement;
  const root = node.getRootNode();
  return root instanceof ShadowRoot && root.host instanceof HTMLElement ? root.host : null;
}

/** Der echte Abschnitt um `element` — oder `null` im klassischen Editor. */
export function findSection(element: HTMLElement): HTMLElement | null {
  for (let node = parentAcross(element); node !== null && node !== document.body; node = parentAcross(node)) {
    if (node.matches(SECTION_BLOCK) && !node.matches(ANCESTOR_COPY)) return node;
  }
  return null;
}

const takesSpace = (node: Element): boolean => {
  if (NOT_RENDERED.has(node.tagName)) return false;
  const { display, position } = getComputedStyle(node);
  return display !== "none" && position !== "absolute" && position !== "fixed";
};

/**
 * Ob auf dem Weg nach oben kein Kasten ein Geschwister hat, das Platz
 * einnimmt. Gezählt wird, was im DOM steht, nicht was schon eine Höhe hat —
 * ein Block, der noch lädt, wäre beim ersten Bild 0px hoch.
 */
function standsAlone(element: HTMLElement, section: HTMLElement): boolean {
  let child: Element = element;
  for (let node = parentAcross(element); node !== null; node = parentAcross(node)) {
    for (const other of Array.from(node.children)) {
      if (other !== child && takesSpace(other)) return false;
    }
    if (node === section) return true;
    child = node;
  }
  return false;
}

/** Setzt `edge` mit Nachdruck — man-theme führt den Abstand selbst mit `!important`. */
function force(undos: Array<() => void>, node: HTMLElement, edge: Edge, value: string): void {
  const previousValue = node.style.getPropertyValue(edge);
  const previousPriority = node.style.getPropertyPriority(edge);
  undos.push(() => {
    if (previousValue === "") node.style.removeProperty(edge);
    else node.style.setProperty(edge, previousValue, previousPriority);
  });
  node.style.setProperty(edge, value, "important");
}

const EDGES: readonly Edge[] = ["padding-top", "padding-bottom", "margin-top", "margin-bottom"];

/**
 * Nimmt die Abstände um die Leiste bis zur Kante ihres Abschnitts weg.
 *
 * @returns nimmt den Eingriff zurück — oder `null`, wenn nichts angefasst
 * wurde, weil die Leiste in keinem Abschnitt oder nicht allein darin steht.
 */
export function fitSection(element: HTMLElement): (() => void) | null {
  const section = findSection(element);
  if (section === null || !standsAlone(element, section)) return null;
  const frame = section.firstElementChild;
  const undos: Array<() => void> = [];

  for (let node: HTMLElement | null = parentAcross(element); node !== null; node = parentAcross(node)) {
    if (getComputedStyle(node).display !== "contents") {
      for (const edge of EDGES) {
        const air = node === frame && edge.startsWith("padding") ? FRAME_AIR : "0px";
        if (getComputedStyle(node).getPropertyValue(edge) !== air) force(undos, node, edge, air);
      }
    }
    if (node === section) break;
  }

  return () => {
    for (const undo of undos.reverse()) undo();
  };
}

/** Hängt `fitSection` an die Lebensdauer der Leiste. */
export function useSectionFit(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = ref.current;
    if (element === null) return undefined;
    const undo = fitSection(element);
    return () => undo?.();
  }, [ref]);
}
