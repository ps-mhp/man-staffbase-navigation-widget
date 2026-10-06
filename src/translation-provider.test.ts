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

import { decodePayload, encodePayload } from "@shared/payload";

import { HEADING_MARKER, navigationTranslationProvider as provider, readHeading } from "./translation-provider";

describe("readHeading", () => {
  it("nimmt eine von Hand eingetragene Überschrift", () => {
    expect(readHeading("  Weiterführende Links ")).toBe("Weiterführende Links");
  });

  it("packt eine übersetzte Überschrift aus", () => {
    expect(readHeading(encodePayload("Further links"))).toBe("Further links");
  });

  it("kennt keine Überschrift, wenn nichts oder nur Leerraum dasteht", () => {
    for (const raw of [undefined, null, "", "   ", 3]) expect(readHeading(raw)).toBeNull();
  });
});

describe("navigationTranslationProvider", () => {
  it("zeigt auf das Attribut der Überschrift", () => {
    expect(provider.ref).toEqual({ tagName: "navigation-widget", attribute: "heading" });
  });

  it("schickt die Überschrift als markierten, maskierten Absatz", () => {
    const html = provider.toTranslatable('<b>A</b> & "B"')!;

    expect(html).toContain(HEADING_MARKER);
    expect(html).toContain("&lt;b&gt;A&lt;/b&gt; &amp; &quot;B&quot;");
  });

  it("hat ohne Überschrift nichts zu schicken", () => {
    expect(provider.toTranslatable(null)).toBeNull();
    expect(provider.toTranslatable(" ")).toBeNull();
  });

  it("erkennt die eigene Antwort", () => {
    expect(provider.acceptsTranslated(provider.toTranslatable("Links")!)).toBe(true);
    expect(provider.acceptsTranslated("<p>fremd</p>")).toBe(false);
  });

  it("speichert die Übersetzung als reinen Text in der Hülle", () => {
    const stored = provider.fromTranslated(`<p ${HEADING_MARKER}="1">Further <b>links</b></p>`, "Links")!;

    expect(decodePayload(stored)).toBe("Further links");
  });

  it("lässt die Quellüberschrift stehen, wenn die Übersetzung sie verloren hat", () => {
    expect(provider.fromTranslated(`<p ${HEADING_MARKER}="1"> </p>`, "Links")).toBeNull();
    expect(provider.fromTranslated("<p>fremd</p>", "Links")).toBeNull();
  });
});
