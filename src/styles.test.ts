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
  it.each([
    "man-nav__open",
    "man-nav__folder",
    "man-nav__scroll-button",
    "man-nav__link",
    "man-nav__list",
    "man-nav__item",
    "man-nav__menu-link",
  ])("setzt %s gegen die Regeln der Wirtsseite durch", (className) => {
    expect(css).toMatch(outshineRule(className));
  });

  it("rundet nur nach den MAN-Tokens", () => {
    const invented = [...css.matchAll(/border-radius:\s*([^;}]+)/g)]
      .map((match) => match[1].trim())
      .filter((value) => !value.startsWith("var(--man-radius") && !value.startsWith("0"));

    expect(invented).toEqual([]);
  });

  it("scrollt die Unterpunkte waagerecht, ohne Balken und ohne Umbruch", () => {
    expect(css).toMatch(/\.man-nav__scroller\s*\{[^}]*overflow-x:\s*auto[^}]*scrollbar-width:\s*none/);
    expect(css).toMatch(/\.man-nav__scroller::-webkit-scrollbar\s*\{\s*display:\s*none/);
    expect(css).toMatch(/flex-wrap:\s*nowrap\s*!important/);
  });

  // Live gesehen 06.11.2026: der Kasten des Content Designers (`overflow:
  // hidden`) schnitt das Dropdown unter der Leiste ganz ab.
  it("schneidet die Dropdowns nicht ab", () => {
    const [navRule] = css.match(/\.man-nav\s*\{[^}]*\}/) ?? [""];
    expect(navRule).not.toMatch(/overflow/);
    const [dropdownRule] = css.match(/\.man-nav__dropdown\s*\{[^}]*\}/) ?? [""];
    expect(dropdownRule).toMatch(/position:\s*fixed/);
    // Die Vorgaben des Browsers für `[popover]` legten es mittig übers Fenster.
    expect(dropdownRule).toMatch(/inset:\s*auto/);
    expect(dropdownRule).toMatch(/margin:\s*0/);
  });

  // Live gesehen am 06.10.2026: nach dem Tippen blieb der Eintrag unter dem
  // Finger hervorgehoben.
  it("hebt Einträge nur unter einem echten Zeiger hervor", () => {
    const [outsideHoverQuery] = css.split("@media (hover: hover)");
    expect(outsideHoverQuery).not.toMatch(/:hover\s*[,{]/);
  });

  // Vorgabe 06.11.2026: unter dem Zeiger wird der Text rot, keine Fläche.
  it.each(["man-nav__link", "man-nav__menu-link", "man-nav__open", "man-nav__folder"])(
    "färbt %s unter dem Zeiger MAN-rot, gegen die Wirtsseite durchgesetzt",
    (className) => {
      const selector = `\\.${className.replace(/-/g, "\\-")}`.repeat(5);
      expect(css).toMatch(
        new RegExp(`@media \\(hover: hover\\)\\s*\\{\\s*${selector}:hover\\s*\\{\\s*color:\\s*var\\(--man-red, #e40045\\) !important`),
      );
    },
  );

  // Der Knopf „Erneut versuchen“ ist ein Craft-Knopf und behält seinen Hover.
  it("hinterlegt die Einträge unter dem Zeiger nicht", () => {
    expect(css).not.toMatch(/\.man-nav__(?!retry)[\w-]+(?:\.man-nav__[\w-]+)*:hover[^{]*\{[^}]*background/);
  });

  // Vorgabe 06.11.2026: die Seite, auf der man ist, trägt eine rote Linie
  // unter dem ganzen Eintrag; der Text bleibt, wie er ist.
  it("unterstreicht die aktuelle Seite mit einer roten Linie, nicht mit Farbe oder Fettung", () => {
    expect(css).toMatch(/\.man-nav__item--current::after\s*\{[^}]*bottom:\s*0[^}]*background:\s*var\(--man-red, #e40045\)/);
    expect(css).not.toMatch(/aria-current=page\]\s*\{[^}]*(color|font-weight)/);
  });

  it("färbt einen gesperrten Scroll-Knopf unter dem Zeiger nicht", () => {
    expect(css).toMatch(/man-nav__scroll-button:hover:not\(\[aria-disabled=true\]\)\s*\{\s*color:/);
  });

  // Vorgabe 06.11.2026: wie die Vorlage ohne Rahmen und ohne Fläche.
  it("zeichnet keinen Rahmen und keine Fläche", () => {
    const [navRule] = css.match(/\.man-nav\s*\{[^}]*\}/) ?? [""];
    expect(navRule).not.toMatch(/(^|[\s;{])(border|background)[a-z-]*:/);
  });

  // Vorgabe 06.10.2026: kein Unterstrich im Hover, auch nicht von der Wirtsseite.
  it("unterstreicht den Text der Einträge nie", () => {
    expect(css).not.toMatch(/text-decoration:\s*underline/);
    expect(css).toMatch(/\.man-nav__link:hover\s*,?[^{]*\{[^}]*text-decoration:\s*none\s*!important/);
  });

  it("bewegt den Pfeil nur, wenn niemand weniger Bewegung eingestellt hat", () => {
    const [beforeQuery] = css.split("prefers-reduced-motion");
    expect(beforeQuery).not.toMatch(/transition:\s*transform/);
    expect(css).toMatch(/prefers-reduced-motion:\s*no-preference[\s\S]*\.man-nav__chevron\s*\{\s*transition:\s*transform/);
  });
});
