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

import { FRAME_AIR, fitSection, findSection } from "./section-fit";

/**
 * Ein Abschnitt des Content Designers mit der Leiste darin, wie
 * `custom-block.mjs` ab 10.0.12 ihn rendert (gemessen 06.11.2026 auf truck):
 * Abschnitt (24px unten), Rahmen (40px oben und unten), Container (`mb-6`,
 * 32px), Spalte, Block, Schattenwirt mit Kopfstyles, Attrappe und Leiste.
 */
function buildSection() {
  const section = document.createElement("div");
  section.dataset.c13yComponent = "section-block";
  section.style.setProperty("padding-bottom", "24px", "important");
  const frame = document.createElement("div");
  frame.style.padding = "40px 20px";
  const container = document.createElement("div");
  container.dataset.c13yComponent = "container-block";
  container.style.marginBottom = "32px";
  const column = document.createElement("div");
  column.dataset.c13yComponent = "column-block";
  const block = document.createElement("div");
  const host = document.createElement("div");
  const root = host.attachShadow({ mode: "open" });
  const copiedStyle = document.createElement("style");
  const copy = document.createElement("div");
  copy.dataset.c13yComponent = "section-block";
  copy.setAttribute("data-sb-c13y-ancestor-copy", "");
  copy.style.display = "contents";
  const nav = document.createElement("nav");

  document.body.append(section);
  section.append(frame);
  frame.append(container);
  container.append(column);
  column.append(block);
  block.append(host);
  root.append(copiedStyle, copy);
  copy.append(nav);
  return { section, frame, container, column, nav };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("fitSection", () => {
  it("findet den echten Abschnitt hinter der Attrappe", () => {
    const { section, nav } = buildSection();
    expect(findSection(nav)).toBe(section);
  });

  it("lässt um eine allein stehende Leiste nur die Luft im Rahmen", () => {
    const { section, frame, container, nav } = buildSection();

    fitSection(nav);

    expect(section.style.getPropertyValue("padding-bottom")).toBe("0px");
    expect(section.style.getPropertyPriority("padding-bottom")).toBe("important");
    expect(container.style.getPropertyValue("margin-bottom")).toBe("0px");
    expect(frame.style.getPropertyValue("padding-top")).toBe(FRAME_AIR);
    expect(frame.style.getPropertyValue("padding-bottom")).toBe(FRAME_AIR);
    // Waagerecht bleibt der Rahmen, wie er ist.
    expect(frame.style.paddingLeft).toBe("20px");
  });

  it("nimmt den Eingriff restlos zurück", () => {
    const { section, frame, container, nav } = buildSection();

    fitSection(nav)!();

    expect(section.style.getPropertyValue("padding-bottom")).toBe("24px");
    expect(section.style.getPropertyPriority("padding-bottom")).toBe("important");
    expect(container.style.marginBottom).toBe("32px");
    expect(frame.style.padding).toBe("40px 20px");
  });

  it("lässt einen Abschnitt in Ruhe, den die Leiste mit anderen Blöcken teilt", () => {
    const { section, container, nav } = buildSection();
    section.firstElementChild!.append(document.createElement("div"));

    expect(fitSection(nav)).toBeNull();
    expect(container.style.marginBottom).toBe("32px");
  });

  it("greift im klassischen Editor nicht ein", () => {
    const nav = document.body.appendChild(document.createElement("nav"));
    expect(fitSection(nav)).toBeNull();
  });
});
