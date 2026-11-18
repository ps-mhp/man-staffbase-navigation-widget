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
 * Das Feld älterer Fassungen im Staffbase-Dialog (`menu-id`): lesen und
 * ausblenden.
 *
 * Es bleibt im Schema, damit der Dialog seinen Wert weiter führt – das
 * Fenster beginnt mit ihm, und solange `navigation-config` keinen Startpunkt
 * trägt, gilt er auf der Seite. Zu sehen soll es nicht mehr sein: zwei Wege
 * zum selben Wert laden zu Widersprüchen ein.
 *
 * Gefunden wird es über das, was RJSF und der Content Designer gleich
 * vergeben: `id="root_<key>"` am Eingabeelement oder `for="root_<key>"` an
 * seiner Beschriftung. Ausgeblendet wird die ganze Zeile: der größte
 * Vorfahre, der kein anderes Feld enthält.
 *
 * Nur im eigenen Dialog: dem Formular, das `navigation-config` führt. Studio
 * lädt alle Widget-Bündel in dasselbe Dokument, und `root_<key>` ist
 * widgetübergreifend – `menu-id` hat auch das Hotspot-Widget. Dokumentweit
 * ausgeblendet, stieg die Zeile dort bis zum ganzen Formular hoch, und dessen
 * Dialog blieb leer (so geschehen im Hotspot-Widget bis 0.2.0-rc.7).
 *
 * Wie `legacy-fields.ts` im Podcast- und im Hotspot-Widget; ein gemeinsamer
 * Ort in `src/shared` steht noch aus.
 */

import { configFieldSelector } from "@shared/config-field-injector";

import { LEGACY_ATTRIBUTES, NAVIGATION_CONFIG_ATTRIBUTE } from "./configuration-schema";
import type { LegacyNavigationAttributes } from "./navigation-config";

const FIELD_MARK = '[id^="root_"], label[for^="root_"]';

const fieldKeyOf = (element: Element): string =>
  element instanceof HTMLLabelElement ? element.htmlFor : element.id;

function rowOf(anchor: Element): HTMLElement {
  const key = fieldKeyOf(anchor);
  let row = anchor as HTMLElement;
  while (row.parentElement !== null && row.parentElement.tagName !== "FORM") {
    const parent = row.parentElement;
    const foreign = Array.from(parent.querySelectorAll(FIELD_MARK)).some((node) => fieldKeyOf(node) !== key);
    if (foreign) break;
    row = parent;
  }
  return row;
}

function anchorOf(root: ParentNode, key: string): Element | null {
  const id = `root_${key}`;
  return root.querySelector(`[id="${id}"]`) ?? root.querySelector(`label[for="${id}"]`);
}

/** Die Formulare, die das eigene Feld führen – nur dort wird gelesen und ausgeblendet. */
function ownForms(root: ParentNode, ownKey: string): HTMLFormElement[] {
  const forms = Array.from(root.querySelectorAll(`[id="root_${ownKey}"]`)).map((field) => field.closest("form"));
  return Array.from(new Set(forms.filter((form): form is HTMLFormElement => form !== null)));
}

/**
 * Hält die Zeilen dieser Felder verborgen, solange der eigene Dialog sie zeigt.
 * @param keys die auszublendenden Felder.
 * @param ownKey das Feld, an dem der eigene Dialog zu erkennen ist.
 * @param root der zu beobachtende Teilbaum; offengelegt für Tests.
 * @returns eine Funktion, die aufhört und die Zeilen wieder zeigt.
 */
export function startHiddenFields(keys: readonly string[], ownKey: string, root: ParentNode = document): () => void {
  const hidden = new Set<HTMLElement>();

  const apply = (): void => {
    for (const form of ownForms(root, ownKey)) {
      for (const key of keys) {
        const anchor = anchorOf(form, key);
        if (anchor === null) continue;
        const row = rowOf(anchor);
        if (row.style.display !== "none") row.style.display = "none";
        hidden.add(row);
      }
    }
  };

  apply();
  const observer = new MutationObserver(apply);
  const target = root === document ? document.body : (root as Node);
  observer.observe(target, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    hidden.forEach((row) => {
      row.style.display = "";
    });
    hidden.clear();
  };
}

/**
 * Der Wert eines Felds, wenn er lesbar ist: nur ein echtes Eingabeelement
 * trägt `.value`. Fehlt es oder trägt `root_<key>` ein Element ohne Wert,
 * `null` – dann fehlt der Schlüssel, und das alte Attribut gilt weiter.
 */
function readableValue(form: ParentNode, key: string): string | null {
  const element = form.querySelector(configFieldSelector(key));
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement ? element.value : null;
}

/** Die alten Felder, wie der eigene Dialog sie gerade führt; leer ohne eigenen Dialog. */
export function readLegacyFromDialog(root: ParentNode = document): LegacyNavigationAttributes {
  const [form] = ownForms(root, NAVIGATION_CONFIG_ATTRIBUTE);
  if (form === undefined) return {};
  return Object.fromEntries(
    LEGACY_ATTRIBUTES.flatMap((key) => {
      const value = readableValue(form, key);
      return value === null ? [] : [[key, value]];
    }),
  );
}
