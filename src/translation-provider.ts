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

import { decodePayload, encodePayload, isPayload } from "@shared/payload";
import { TranslationProvider } from "@shared/translation/carriers";

import { HEADING_ATTRIBUTE } from "./configuration-schema";

/** Muss dem Tag entsprechen, unter dem `index.tsx` das Widget anmeldet. */
export const NAVIGATION_WIDGET_TAG = "navigation-widget";

/** Kennzeichnet das Element mit der Überschrift, in welcher Antwortform auch immer. */
export const HEADING_MARKER = "data-mhp-nav-heading";

/**
 * Die Überschrift, wie sie gespeichert ist: von Hand eingetragen roh, nach
 * einer Übersetzung in der `b64:`-Hülle, die den Durchlauf übersteht (siehe
 * `@shared/payload`). `null`, wenn keine eingetragen ist.
 */
export function readHeading(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = isPayload(raw) ? (decodePayload(raw) ?? "") : raw;
  const trimmed = text.trim();
  return trimmed === "" ? null : trimmed;
}

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Wie die Überschrift durch Staffbases Inhaltsübersetzung reist.
 *
 * Sie liegt in einem Attribut, und `POST /api/translations` übersetzt
 * Textknoten, keine Attribute. Deshalb geht sie als Text eines markierten
 * Absatzes hinaus — wie der Tab-Titel von `content-tabs`. Die Titel der
 * Menüpunkte brauchen das nicht: die liefert Staffbase selbst je Sprache.
 */
export const navigationTranslationProvider: TranslationProvider = {
  id: `${NAVIGATION_WIDGET_TAG}/${HEADING_ATTRIBUTE}`,
  label: "Navigation",
  ref: { tagName: NAVIGATION_WIDGET_TAG, attribute: HEADING_ATTRIBUTE },

  toTranslatable: (stored) => {
    const heading = readHeading(stored);
    return heading === null ? null : `<p ${HEADING_MARKER}="1">${escapeHtml(heading)}</p>`;
  },

  acceptsTranslated: (html) => html.includes(HEADING_MARKER),

  fromTranslated: (html, _stored) => {
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
    const translated = doc.body.querySelector(`[${HEADING_MARKER}]`)?.textContent?.trim() ?? "";
    // Leer heißt verloren, nicht übersetzt — dann bleibt die Überschrift der Quellsprache.
    return translated === "" ? null : encodePayload(translated);
  },
};
