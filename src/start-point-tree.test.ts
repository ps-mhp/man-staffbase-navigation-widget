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

import { MAX_DEPTH, MAX_LEVEL_REQUESTS } from "@shared/staffbase/menu-start-points";

import {
  defaultExpandedIds,
  filterTreeNodes,
  isSelectableStartPoint,
  loadStartPointTree,
  toTreeNodes,
} from "./start-point-tree";
import { MENU, ids, levelLoader } from "./start-point-tree.testing";

describe("loadStartPointTree", () => {
  it("lädt das ganze Menü Ebene für Ebene, verborgene Einträge und Seiten eingeschlossen", async () => {
    const load = levelLoader(MENU);
    const tree = await loadStartPointTree(load);

    expect(tree?.root.entry.title).toBe("Hauptmenü");
    expect(tree?.root.children.map((node) => node.entry.title)).toEqual(["Unternehmen", "Arbeiten bei MAN", "Service", "Kontakt"]);
    expect(tree?.index.get(ids.standorte)?.path.map((node) => node.entry.title)).toEqual([
      "Hauptmenü",
      "Unternehmen",
      "Standorte",
    ]);
    expect(tree?.index.get(ids.archiv)?.node.entry.hidden).toBe(true);
    // Seiten ohne Unterpunkte fragen nichts nach.
    expect(load).not.toHaveBeenCalledWith(ids.strategie);
  });

  it("ist `null`, wenn schon das Hauptmenü nicht zu laden ist", async () => {
    expect(await loadStartPointTree(async () => null)).toBeNull();
  });

  it("lässt eine Ebene, die nicht zu laden ist, ohne Kinder stehen", async () => {
    const tree = await loadStartPointTree(levelLoader(MENU));

    expect(tree?.index.get(ids.organisation)?.node).toEqual(expect.objectContaining({ children: [], loaded: false }));
  });

  it("hält die Grenzen der bisherigen Auswahlliste ein", async () => {
    const wide = Array.from({ length: MAX_LEVEL_REQUESTS + 20 }, (_, index) => index.toString(16).padStart(24, "a"));
    const load = jest.fn(async (id?: string) =>
      id === undefined
        ? {
            entry: { id: ids.root, title: "Hauptmenü", href: null, external: false, hasChildren: true, hidden: false },
            parentId: null,
            children: wide.map((child) => ({ id: child, title: child, href: null, external: false, hasChildren: true, hidden: false })),
          }
        : null,
    );

    await loadStartPointTree(load);

    expect(load).toHaveBeenCalledTimes(MAX_LEVEL_REQUESTS);
  });

  it("steigt höchstens so tief wie die bisherige Auswahlliste", async () => {
    const chain = Array.from({ length: MAX_DEPTH + 3 }, (_, index) => index.toString(16).padStart(24, "b"));
    const load = jest.fn(async (id?: string) => {
      const position = id === undefined ? 0 : chain.indexOf(id);
      const self = chain[position];
      const child = chain[position + 1];
      return {
        entry: { id: self, title: `Ebene ${position}`, href: null, external: false, hasChildren: true, hidden: false },
        parentId: null,
        children: [{ id: child, title: `Ebene ${position + 1}`, href: null, external: false, hasChildren: true, hidden: false }],
      };
    });

    const tree = await loadStartPointTree(load);

    expect(load).toHaveBeenCalledTimes(MAX_DEPTH);
    expect(tree?.index.get(chain[MAX_DEPTH])?.node.loaded).toBe(false);
  });
});

describe("toTreeNodes", () => {
  it("beschreibt jeden Eintrag wie im Entwurf: Wurzel, Unterpunkte, Seite, verborgen", async () => {
    const tree = (await loadStartPointTree(levelLoader(MENU)))!;
    const [root] = toTreeNodes(tree, null);
    const unternehmen = root.children![0];

    expect(root).toEqual(expect.objectContaining({ id: ids.root, label: "Hauptmenü", description: "Wurzel" }));
    expect(unternehmen.description).toBe("3 Unterpunkte");
    expect(unternehmen.children!.map((node) => node.description)).toEqual([
      "Seite",
      "2 Unterpunkte",
      "Unterpunkte nicht geladen",
    ]);
    // Seiten sind keine Ordner: kein Pfeil, ein Seitensymbol.
    expect(unternehmen.children![0].children).toBeUndefined();
    const service = root.children![2];
    expect(service.children!.map((node) => node.description)).toEqual([
      "Seite",
      "Seite · im Menü verborgen",
      "Link",
    ]);
    expect(service.children![1].icon).toBeDefined();
  });

  it("markiert den Startpunkt in seiner Unterzeile", async () => {
    const tree = (await loadStartPointTree(levelLoader(MENU)))!;
    const [root] = toTreeNodes(tree, ids.standorte);

    expect(root.children![0].children![1].description).toBe("2 Unterpunkte · Startpunkt");
  });

  it("zeigt einen Startpunkt, der nicht im geladenen Menü steht, ganz oben", async () => {
    const tree = (await loadStartPointTree(levelLoader(MENU)))!;
    const outside = "ffffffffffffffffffffffff";

    const nodes = toTreeNodes(tree, outside, "Archiv 2019");

    expect(nodes[0]).toEqual(
      expect.objectContaining({ id: outside, label: "Archiv 2019", description: "Startpunkt · nicht im geladenen Menü" }),
    );
    expect(toTreeNodes(tree, outside)[0].label).toBe(outside);
  });
});

describe("isSelectableStartPoint", () => {
  it("lässt nur Einträge mit Unterpunkten zu, wie die bisherige Auswahlliste", async () => {
    const tree = (await loadStartPointTree(levelLoader(MENU)))!;

    expect(isSelectableStartPoint(tree, ids.root)).toBe(true);
    expect(isSelectableStartPoint(tree, ids.standorte)).toBe(true);
    expect(isSelectableStartPoint(tree, ids.organisation)).toBe(true);
    expect(isSelectableStartPoint(tree, ids.strategie)).toBe(false);
    expect(isSelectableStartPoint(tree, "unbekannt")).toBe(false);
  });
});

describe("defaultExpandedIds", () => {
  it("öffnet die Wurzel und den Weg zum Startpunkt", async () => {
    const tree = (await loadStartPointTree(levelLoader(MENU)))!;

    expect(defaultExpandedIds(tree, null)).toEqual([ids.root]);
    expect(defaultExpandedIds(tree, ids.standorte)).toEqual([ids.root, ids.unternehmen]);
    expect(defaultExpandedIds(tree, "unbekannt")).toEqual([ids.root]);
  });
});

describe("filterTreeNodes", () => {
  it("lässt ohne Suche alles stehen", async () => {
    const nodes = toTreeNodes((await loadStartPointTree(levelLoader(MENU)))!, null);

    expect(filterTreeNodes(nodes, "  ")).toEqual({ nodes, expand: [] });
  });

  it("zeigt Treffer samt Weg dorthin und klappt den Weg auf", async () => {
    const nodes = toTreeNodes((await loadStartPointTree(levelLoader(MENU)))!, null);

    const result = filterTreeNodes(nodes, "münch");

    expect(result.expand).toEqual([ids.root, ids.unternehmen, ids.standorte]);
    const [root] = result.nodes;
    expect(root.children!.map((node) => node.label)).toEqual(["Unternehmen"]);
    expect(root.children![0].children!.map((node) => node.label)).toEqual(["Standorte"]);
    expect(root.children![0].children![0].children!.map((node) => node.label)).toEqual(["München"]);
  });

  it("behält einen passenden Ordner mit allen Kindern", async () => {
    const nodes = toTreeNodes((await loadStartPointTree(levelLoader(MENU)))!, null);

    const [root] = filterTreeNodes(nodes, "STANDORTE").nodes;

    expect(root.children![0].children![0].children!.map((node) => node.label)).toEqual(["München", "Nürnberg"]);
  });

  it("ist leer ohne Treffer", async () => {
    const nodes = toTreeNodes((await loadStartPointTree(levelLoader(MENU)))!, null);

    expect(filterTreeNodes(nodes, "xyz").nodes).toEqual([]);
  });
});
