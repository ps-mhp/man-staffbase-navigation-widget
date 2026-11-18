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
 * Testhilfe: ein kleines Menü wie aus `GET /api/menu/{id}`, schon gelesen.
 *
 * Hauptmenü
 * ├─ Unternehmen (Ordner)
 * │  ├─ Strategie (Seite)
 * │  ├─ Standorte (Seite) ─ München, Nürnberg
 * │  └─ Organisation (Seite, Ebene nicht zu laden)
 * ├─ Arbeiten bei MAN (Ordner) ─ Karriere
 * ├─ Service (Ordner) ─ IT-Service, Archiv (verborgen), Wiki (fremde Adresse)
 * └─ Kontakt (Seite)
 */

import type { MenuEntry, MenuLevel } from "@shared/staffbase/menu";

const hex = (n: number): string => n.toString(16).padStart(24, "0");

export const ids = {
  root: hex(1),
  unternehmen: hex(2),
  strategie: hex(3),
  standorte: hex(4),
  muenchen: hex(5),
  nuernberg: hex(6),
  organisation: hex(7),
  arbeiten: hex(8),
  karriere: hex(9),
  service: hex(10),
  it: hex(11),
  archiv: hex(12),
  wiki: hex(13),
  kontakt: hex(14),
} as const;

const page = (id: string, title: string, extra: Partial<MenuEntry> = {}): MenuEntry => ({
  id,
  title,
  href: `/openlink/content/page/${id}`,
  external: false,
  hasChildren: false,
  hidden: false,
  ...extra,
});

const folder = (id: string, title: string): MenuEntry => ({ ...page(id, title), href: null, hasChildren: true });

const level = (entry: MenuEntry, parentId: string | null, children: MenuEntry[]): MenuLevel => ({ entry, parentId, children });

/** Die Ebenen nach ID; das Hauptmenü unter `""`, wie `fetchMenuLevel()` ohne ID. */
export const MENU: Readonly<Record<string, MenuLevel>> = (() => {
  const root = level({ ...folder(ids.root, "Hauptmenü") }, null, [
    folder(ids.unternehmen, "Unternehmen"),
    folder(ids.arbeiten, "Arbeiten bei MAN"),
    folder(ids.service, "Service"),
    page(ids.kontakt, "Kontakt"),
  ]);
  const unternehmen = level(folder(ids.unternehmen, "Unternehmen"), ids.root, [
    page(ids.strategie, "Strategie"),
    page(ids.standorte, "Standorte", { hasChildren: true }),
    page(ids.organisation, "Organisation", { hasChildren: true }),
  ]);
  const standorte = level(page(ids.standorte, "Standorte", { hasChildren: true }), ids.unternehmen, [
    page(ids.muenchen, "München"),
    page(ids.nuernberg, "Nürnberg"),
  ]);
  const arbeiten = level(folder(ids.arbeiten, "Arbeiten bei MAN"), ids.root, [page(ids.karriere, "Karriere")]);
  const service = level(folder(ids.service, "Service"), ids.root, [
    page(ids.it, "IT-Service"),
    page(ids.archiv, "Archiv", { hidden: true }),
    page(ids.wiki, "Wiki", { href: "https://wiki.example.test/", external: true }),
  ]);
  return {
    "": root,
    [ids.root]: root,
    [ids.unternehmen]: unternehmen,
    [ids.standorte]: standorte,
    [ids.arbeiten]: arbeiten,
    [ids.service]: service,
  };
})();

/** Lädt aus `menu` wie `fetchMenuLevel`: ohne ID das Hauptmenü, Unbekanntes als `null`. */
export function levelLoader(
  menu: Readonly<Record<string, MenuLevel>>,
): jest.Mock<Promise<MenuLevel | null>, [string?]> {
  return jest.fn(async (id?: string) => menu[id ?? ""] ?? null);
}
