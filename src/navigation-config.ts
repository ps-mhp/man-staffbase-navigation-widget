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
 * Die Konfiguration der Navigation in einem Attribut: `navigation-config`.
 *
 * Bis 0.2.0-rc.6 stand der Startpunkt allein im Feld `menu-id` des
 * Staffbase-Dialogs. Seither pflegt ihn das Fenster „Startpunkt wählen“ und
 * schreibt ihn hierher.
 *
 * Ältere Blöcke tragen nur `menu-id`. Gemischt wird je Schlüssel: was in
 * `navigation-config` steht, gilt; fehlt ein Schlüssel dort, gilt das alte
 * Feld. Ein Block ohne `navigation-config` zeigt deshalb genau, was er bisher
 * zeigte. Geschrieben wird nur, was die Redaktion im Fenster setzt – ein
 * Schlüssel, der nicht gesetzt ist, fehlt im JSON und überdeckt nichts.
 *
 * Der Startpunkt steht so, wie er eingetragen wurde: eine ID oder eine
 * Adresse, die auf einer endet. Gelesen wird beides (`readMenuId`); nichts
 * wird umgeschrieben, damit Öffnen und Übernehmen keinen Block verändert.
 */

import { decodePayload, encodePayload } from "@shared/payload";
import { readMenuId } from "@shared/staffbase/menu";

import { MENU_ID_ATTRIBUTE, NAVIGATION_CONFIG_ATTRIBUTE } from "./configuration-schema";

export interface NavigationConfig {
  /** Der Startpunkt: ID oder Adresse. Fehlt er, gilt das alte Feld `menu-id`. */
  menuId?: string;
}

/** Das alte Feld, so wie es am Element oder im Dialog ankommt. */
export interface LegacyNavigationAttributes {
  [MENU_ID_ATTRIBUTE]?: unknown;
}

export type NavigationAttributes = LegacyNavigationAttributes & {
  [NAVIGATION_CONFIG_ATTRIBUTE]?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/**
 * Liest `navigation-config`; `null`, wenn dort nichts Brauchbares steht –
 * leer, kaputt kodiert oder kein Objekt. Ein Schlüssel, der keine
 * Zeichenkette ist, fehlt im Ergebnis.
 */
export function readNavigationConfig(raw: unknown): NavigationConfig | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = parseJson(decodePayload(trimmed) ?? trimmed);
  if (!isRecord(value)) return null;
  return typeof value.menuId === "string" ? { menuId: value.menuId } : {};
}

/** Schreibt `navigation-config`, kodiert wie die übrigen JSON-Attribute (`@shared/payload`). */
export function serializeNavigationConfig(config: NavigationConfig): string {
  return encodePayload(JSON.stringify(config.menuId === undefined ? {} : { menuId: config.menuId }));
}

/** Je Schlüssel: der neue Wert, sonst das alte Feld; ein altes Feld, das keine Zeichenkette ist, fehlt. */
export function mergeNavigationConfig(
  config: NavigationConfig | null,
  legacy: LegacyNavigationAttributes,
): NavigationConfig {
  const legacyMenuId = legacy[MENU_ID_ATTRIBUTE];
  const menuId = config?.menuId ?? (typeof legacyMenuId === "string" ? legacyMenuId : undefined);
  return menuId === undefined ? {} : { menuId };
}

/** Was gilt: `navigation-config`, je Schlüssel ergänzt um das alte Feld. */
export function resolveNavigationConfig(attrs: NavigationAttributes): NavigationConfig {
  return mergeNavigationConfig(readNavigationConfig(attrs[NAVIGATION_CONFIG_ATTRIBUTE]), attrs);
}

/** Der Startpunkt der Leiste als ID; `null`, solange keiner gewählt oder lesbar ist. */
export function resolveStartId(attrs: NavigationAttributes): string | null {
  return readMenuId(resolveNavigationConfig(attrs).menuId);
}
