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

import {
  START_POINT_ISSUE,
  navigationChangesStatus,
  validateNavigationConfig,
  validateStartPoint,
} from "./start-point-rules";

const ID = "6a73580860fe1414378d4660";

describe("validateStartPoint", () => {
  it("lässt eine ID und eine Adresse mit ID durch", () => {
    expect(validateStartPoint(ID)).toEqual([]);
    expect(validateStartPoint(`https://www.mti.man/content/page/${ID}`)).toEqual([]);
    expect(validateStartPoint(`  ${ID.toUpperCase()} `)).toEqual([]);
  });

  it("verlangt einen Startpunkt", () => {
    expect(validateStartPoint("")).toEqual([{ id: START_POINT_ISSUE, message: expect.stringContaining("Startpunkt fehlt") }]);
    expect(validateStartPoint("   ")).toHaveLength(1);
  });

  it("meldet Text, aus dem sich keine Menü-ID lesen lässt", () => {
    expect(validateStartPoint("Standorte")).toEqual([
      { id: START_POINT_ISSUE, message: expect.stringContaining("keine Menü-ID") },
    ]);
  });
});

describe("validateNavigationConfig", () => {
  it("verlangt einen lesbaren Startpunkt", () => {
    expect(validateNavigationConfig({ menuId: ID })).toEqual([]);
    expect(validateNavigationConfig({})).toEqual([{ id: START_POINT_ISSUE, message: expect.stringContaining("Startpunkt fehlt") }]);
    expect(validateNavigationConfig({ menuId: "Standorte" })).toHaveLength(1);
  });
});

describe("navigationChangesStatus", () => {
  it("schweigt ohne Änderung", () => {
    expect(navigationChangesStatus({ menuId: ID }, { menuId: ID })).toBeUndefined();
    expect(navigationChangesStatus({}, {})).toBeUndefined();
  });

  it("nennt einen geänderten oder entfernten Startpunkt", () => {
    expect(navigationChangesStatus({ menuId: ID }, {})).toBe("Startpunkt geändert");
    expect(navigationChangesStatus({ menuId: ID }, { menuId: "6aa0161549d51f0f57864771" })).toBe("Startpunkt geändert");
    expect(navigationChangesStatus({}, { menuId: ID })).toBe("Startpunkt entfernt");
  });
});
