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
 * Wachen über das übersetzte Stylesheet. Aussehen prüft jsdom nicht; prüfbar
 * ist die Abwehr gegen die Wirtsseite, die jedem blanken `button` den
 * Grundriss eines Handlungsknopfs gibt (im Hotspot-Widget am 10.09.2026 so
 * gesehen), und dass Bewegung nur läuft, wo sie erwünscht ist.
 */

import css from "./styles/navigation-menu.scss";

function outshineRule(className: string): RegExp {
  const selector = `\\.${className.replace(/-/g, "\\-")}`.repeat(5);
  return new RegExp(`${selector}\\s*\\{[^}]*\\}`);
}

describe("Stylesheet", () => {
  it.each(["man-nav__back", "man-nav__open", "man-nav__row", "man-nav__link", "man-nav__list", "man-nav__item"])(
    "setzt %s gegen die Regeln der Wirtsseite durch",
    (className) => {
      expect(css).toMatch(outshineRule(className));
    },
  );

  it("rundet nur nach den MAN-Tokens", () => {
    const invented = [...css.matchAll(/border-radius:\s*([^;}]+)/g)]
      .map((match) => match[1].trim())
      .filter((value) => !value.startsWith("var(--man-radius") && !value.startsWith("0"));

    expect(invented).toEqual([]);
  });

  it("blättert nur, wenn niemand weniger Bewegung eingestellt hat", () => {
    const [beforeQuery] = css.split("prefers-reduced-motion");
    expect(beforeQuery).not.toMatch(/animation:\s*man-nav-from/);
    expect(css).toMatch(/prefers-reduced-motion:\s*no-preference[\s\S]*animation:\s*man-nav-from-right/);
  });

  it("lässt die Ebene dem Finger über dieselbe Variable folgen, die die Geste setzt", () => {
    expect(css).toContain("translateX(var(--man-nav-drag, 0px))");
    expect(css).toMatch(/\.man-nav--dragging \.man-nav__panel\s*\{[^}]*transition:\s*none/);
  });

  // Live gesehen am 06.10.2026: nach dem Blättern per Tipp blieb die Zeile
  // unter dem Finger grau hinterlegt.
  it("hebt Zeilen nur unter einem echten Zeiger hervor", () => {
    const [outsideHoverQuery] = css.split("@media (hover: hover)");
    expect(outsideHoverQuery).not.toMatch(/:hover/);
    expect(css).toMatch(/@media \(hover: hover\)\s*\{\s*\.man-nav__item:hover/);
  });

  it("überlässt das Scrollen längs dem Browser", () => {
    expect(css).toMatch(/touch-action:\s*pan-y pinch-zoom/);
  });
});
