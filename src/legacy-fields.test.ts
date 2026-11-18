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

import { readLegacyFromDialog, startHiddenFields } from "./legacy-fields";

const OWN = "navigation-config";
const LEGACY = ["menu-id"];
const ID = "6a73580860fe1414378d4660";

function row(key: string, value = ""): string {
  return `<div data-row="${key}"><label for="root_${key}">${key}</label><input id="root_${key}" value="${value}"><p>Hilfe</p></div>`;
}

const rowOf = (selector: string): HTMLElement | null => document.querySelector<HTMLElement>(selector);

afterEach(() => {
  document.body.innerHTML = "";
});

describe("startHiddenFields", () => {
  it("blendet das alte Feld im eigenen Dialog ganz aus und lässt das eigene stehen", () => {
    document.body.innerHTML = `<form>${row(OWN)}${row("menu-id", ID)}</form>`;

    const stop = startHiddenFields(LEGACY, OWN);

    expect(rowOf('[data-row="menu-id"]')?.style.display).toBe("none");
    expect(rowOf(`[data-row="${OWN}"]`)?.style.display).toBe("");
    stop();
    expect(rowOf('[data-row="menu-id"]')?.style.display).toBe("");
  });

  it("erfasst das Feld, wenn es erst später erscheint", async () => {
    document.body.innerHTML = "<form></form>";
    const stop = startHiddenFields(LEGACY, OWN);

    document.querySelector("form")?.insertAdjacentHTML("beforeend", `${row(OWN)}${row("menu-id")}`);
    await Promise.resolve();

    expect(rowOf('[data-row="menu-id"]')?.style.display).toBe("none");
    stop();
  });

  // Studio lädt alle Widget-Bündel in dasselbe Dokument; `menu-id` führt auch
  // der Hotspot. Dessen Dialog darf nicht leer werden.
  it("lässt den Dialog eines anderen Widgets mit Feld menu-id unberührt", () => {
    document.body.innerHTML =
      `<form id="hotspot"><div data-wrap>${row("config")}${row("menu-id", "fremd")}</div></form>` +
      `<form id="navigation">${row(OWN)}${row("menu-id", ID)}</form>`;

    const stop = startHiddenFields(LEGACY, OWN);

    expect(rowOf('#hotspot [data-row="menu-id"]')?.style.display).toBe("");
    expect(rowOf("#hotspot [data-wrap]")?.style.display).toBe("");
    expect(rowOf('#navigation [data-row="menu-id"]')?.style.display).toBe("none");
    stop();
  });
});

describe("readLegacyFromDialog", () => {
  it("liest das alte Feld aus dem eigenen Dialog, nicht aus einem fremden", () => {
    document.body.innerHTML =
      `<form id="hotspot">${row("config")}${row("menu-id", "fremd")}</form>` +
      `<form id="navigation">${row(OWN)}${row("menu-id", ID)}</form>`;

    expect(readLegacyFromDialog()).toEqual({ "menu-id": ID });
  });

  it("ist leer ohne eigenen Dialog", () => {
    document.body.innerHTML = `<form>${row("config")}${row("menu-id", "fremd")}</form>`;

    expect(readLegacyFromDialog()).toEqual({});
  });

  // Ohne lesbares Feld fehlt der Schlüssel: dann gilt weiter das Attribut am Block.
  it("lässt den Schlüssel weg, wenn das Feld keinen Wert trägt", () => {
    document.body.innerHTML = `<form>${row(OWN)}<div id="root_menu-id" role="combobox"></div></form>`;

    expect(readLegacyFromDialog()).toEqual({});
  });

  it("liest nur im übergebenen Teilbaum", () => {
    document.body.innerHTML = `<div id="scope"><form>${row(OWN)}${row("menu-id", ID)}</form></div>`;

    expect(readLegacyFromDialog(document.getElementById("scope")!)).toEqual({ "menu-id": ID });
  });
});
