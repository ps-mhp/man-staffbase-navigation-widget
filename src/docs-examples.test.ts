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

import { getDocsExamplesResolver } from "@shared/docs/register-docs-examples";
import { MenuLevel, clearMenuCache } from "@shared/staffbase/menu";
import * as menu from "@shared/staffbase/menu";

import { resolveExampleStartPoint } from "./docs-examples";

const level = (children: MenuLevel["children"]): MenuLevel => ({
  entry: { id: "6891d4e0aec53f55e3a819ac", title: "Hauptmenü", href: "/", external: false, hasChildren: true, hidden: false },
  children,
});

const child = (id: string, hasChildren: boolean, hidden = false) => ({
  id,
  title: id,
  href: `/openlink/content/page/${id}`,
  external: false,
  hasChildren,
  hidden,
});

describe("Live-Beispiel", () => {
  beforeEach(() => clearMenuCache());
  afterEach(() => jest.restoreAllMocks());

  it("nimmt den ersten sichtbaren Eintrag mit Unterpunkten", async () => {
    jest
      .spyOn(menu, "fetchMenuLevel")
      .mockResolvedValue(level([child("a", false), child("b", true, true), child("c", true), child("d", true)]));

    await expect(resolveExampleStartPoint()).resolves.toBe("c");
  });

  it("nimmt sonst das Hauptmenü und ohne Menü nichts", async () => {
    const spy = jest.spyOn(menu, "fetchMenuLevel").mockResolvedValue(level([child("a", false)]));
    await expect(resolveExampleStartPoint()).resolves.toBe("6891d4e0aec53f55e3a819ac");

    spy.mockResolvedValue(null);
    await expect(resolveExampleStartPoint()).resolves.toBeNull();
  });

  it("meldet sich beim Dokumentations-Widget an", async () => {
    jest.spyOn(menu, "fetchMenuLevel").mockResolvedValue(null);

    await expect(getDocsExamplesResolver("navigation-widget")?.()).resolves.toEqual({});
  });
});
