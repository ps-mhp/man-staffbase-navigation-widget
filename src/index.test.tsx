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

import React from "react";
import { render, screen } from "@testing-library/react";

import { clearMenuCache } from "@shared/staffbase/menu";

import { MENU_ID_ATTRIBUTE, NAVIGATION_CONFIG_ATTRIBUTE, configurationSchema, uiSchema } from "./configuration-schema";
import { NavigationWidget } from "./index";
import { serializeNavigationConfig } from "./navigation-config";
import { MESSAGES } from "./navigation-menu";

const ARBEITSPLATZ = "6a73580860fe1414378d4660";

describe("Namen der Attribute", () => {
  it("sind genau die Schlüssel, unter denen der Dialog speichert, und klein geschrieben", () => {
    expect(Object.keys(configurationSchema.properties!)).toEqual([NAVIGATION_CONFIG_ATTRIBUTE, MENU_ID_ATTRIBUTE]);
    for (const name of [NAVIGATION_CONFIG_ATTRIBUTE, MENU_ID_ATTRIBUTE]) expect(name).toBe(name.toLowerCase());
  });

  it("tragen auch die Hinweise des Dialogs", () => {
    for (const name of Object.keys(uiSchema)) {
      expect(Object.keys(configurationSchema.properties!)).toContain(name);
    }
  });
});

describe("NavigationWidget", () => {
  beforeEach(() => clearMenuCache());
  afterEach(() => jest.restoreAllMocks());

  it("liest den Startpunkt aus den Attributen", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: ARBEITSPLATZ,
        nodeType: "installation",
        childrenIds: ["6aa0161549d51f0f57864771"],
        config: { localization: { de_DE: { title: "Fahrerarbeitsplatz" } } },
        visibility: ["desktop", "mobile"],
        target: { url: `/openlink/content/page/${ARBEITSPLATZ}` },
        children: {
          data: [
            {
              id: "6aa0161549d51f0f57864771",
              nodeType: "installation",
              childrenIds: [],
              config: { localization: { de_DE: { title: "Lenkrad" } } },
              visibility: ["desktop", "mobile"],
              target: { url: "/openlink/content/page/6aa0161549d51f0f57864771" },
            },
          ],
        },
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(
      <NavigationWidget
        contentLanguage="de_DE"
        {...{ [MENU_ID_ATTRIBUTE]: `https://www.mti.man/content/page/${ARBEITSPLATZ}` }}
      />,
    );

    expect(await screen.findByRole("link", { name: "Lenkrad" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Fahrerarbeitsplatz" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(`/api/menu/${ARBEITSPLATZ}`, expect.anything());
  });

  it("nimmt den Startpunkt aus navigation-config vor dem alten Feld", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(
      <NavigationWidget
        contentLanguage="de_DE"
        {...{
          [NAVIGATION_CONFIG_ATTRIBUTE]: serializeNavigationConfig({ menuId: ARBEITSPLATZ }),
          [MENU_ID_ATTRIBUTE]: "6aa0161549d51f0f57864771",
        }}
      />,
    );

    await screen.findByText(MESSAGES.failed);
    expect(fetchMock).toHaveBeenCalledWith(`/api/menu/${ARBEITSPLATZ}`, expect.anything());
    expect(fetchMock).not.toHaveBeenCalledWith("/api/menu/6aa0161549d51f0f57864771", expect.anything());
  });

  it("zeigt ohne Startpunkt den Hinweis für die Redaktion", () => {
    render(<NavigationWidget contentLanguage="de_DE" />);

    expect(screen.getByText(MESSAGES.noStartPoint)).toBeInTheDocument();
  });
});
