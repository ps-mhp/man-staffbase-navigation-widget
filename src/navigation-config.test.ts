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

import { encodePayload } from "@shared/payload";

import {
  mergeNavigationConfig,
  readNavigationConfig,
  resolveNavigationConfig,
  resolveStartId,
  serializeNavigationConfig,
} from "./navigation-config";

const ID = "6a73580860fe1414378d4660";
const OTHER = "6aa0161549d51f0f57864771";
const ADDRESS = `https://www.mti.man/content/page/${ID}`;

describe("readNavigationConfig", () => {
  it("liest kodiertes und rohes JSON", () => {
    expect(readNavigationConfig(serializeNavigationConfig({ menuId: ID }))).toEqual({ menuId: ID });
    expect(readNavigationConfig(`{"menuId":"${ID}"}`)).toEqual({ menuId: ID });
  });

  it("ist `null` für Leeres, Kaputtes und Nicht-Objekte", () => {
    expect(readNavigationConfig("")).toBeNull();
    expect(readNavigationConfig("   ")).toBeNull();
    expect(readNavigationConfig(undefined)).toBeNull();
    expect(readNavigationConfig("{kaputt")).toBeNull();
    expect(readNavigationConfig(encodePayload("[1,2]"))).toBeNull();
  });

  it("lässt einen Schlüssel weg, der keine Zeichenkette ist", () => {
    expect(readNavigationConfig('{"menuId":42}')).toEqual({});
  });
});

describe("serializeNavigationConfig", () => {
  it("schreibt nur gesetzte Schlüssel", () => {
    expect(readNavigationConfig(serializeNavigationConfig({}))).toEqual({});
    expect(serializeNavigationConfig({})).toMatch(/^b64:/);
  });
});

describe("mergeNavigationConfig", () => {
  it("nimmt je Schlüssel den neuen Wert, sonst das alte Feld", () => {
    expect(mergeNavigationConfig({ menuId: OTHER }, { "menu-id": ID })).toEqual({ menuId: OTHER });
    expect(mergeNavigationConfig({}, { "menu-id": ADDRESS })).toEqual({ menuId: ADDRESS });
    expect(mergeNavigationConfig(null, { "menu-id": ID })).toEqual({ menuId: ID });
  });

  it("lässt den Startpunkt weg, wenn weder das neue noch das alte Feld ihn trägt", () => {
    expect(mergeNavigationConfig(null, {})).toEqual({});
    expect(mergeNavigationConfig({}, { "menu-id": 7 })).toEqual({});
  });
});

describe("resolveStartId", () => {
  // Pflicht: ältere Blöcke tragen nur `menu-id` und zeigen weiter, was sie zeigten.
  it("liest einen alten Block ohne navigation-config genau wie bisher", () => {
    expect(resolveStartId({ "menu-id": ADDRESS })).toBe(ID);
    expect(resolveStartId({ "menu-id": ID.toUpperCase() })).toBe(ID);
    expect(resolveStartId({ "menu-id": "" })).toBeNull();
    expect(resolveStartId({})).toBeNull();
  });

  it("zieht navigation-config dem alten Feld vor", () => {
    const attrs = { "navigation-config": serializeNavigationConfig({ menuId: OTHER }), "menu-id": ID };
    expect(resolveStartId(attrs)).toBe(OTHER);
  });

  it("fällt bei leerer oder kaputter navigation-config auf das alte Feld zurück", () => {
    expect(resolveStartId({ "navigation-config": "", "menu-id": ID })).toBe(ID);
    expect(resolveStartId({ "navigation-config": "b64:%%%", "menu-id": ID })).toBe(ID);
    expect(resolveNavigationConfig({ "navigation-config": serializeNavigationConfig({}), "menu-id": ID })).toEqual({
      menuId: ID,
    });
  });
});
