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

import { MenuEntry, MenuLevel } from "@shared/staffbase/menu";

import {
  HIDDEN_SUFFIX,
  INDENT,
  MAX_LEVEL_REQUESTS,
  MAX_PARALLEL_REQUESTS,
  fetchStartPointOptions,
} from "./start-point-catalog";

const entry = (id: string, title: string, extra: Partial<MenuEntry> = {}): MenuEntry => ({
  id,
  title,
  href: `/openlink/content/page/${id}`,
  external: false,
  hasChildren: false,
  hidden: false,
  ...extra,
});

/** Ein Menü wie in der Truck-Instanz, auf das Nötige verkürzt. */
const tree: Record<string, MenuLevel> = {
  "": {
    entry: entry("root", "Hauptmenü"),
    children: [
      entry("home", "Home"),
      entry("technik", "Technik im Detail", { hasChildren: true }),
      entry("ungenutzt", "Ungenutzt", { hasChildren: true, hidden: true, href: null }),
    ],
  },
  technik: {
    entry: entry("technik", "Technik im Detail", { hasChildren: true }),
    children: [entry("fahrerhaus", "Fahrerhaus", { hasChildren: true })],
  },
  fahrerhaus: {
    entry: entry("fahrerhaus", "Fahrerhaus", { hasChildren: true }),
    children: [entry("arbeitsplatz", "Fahrerarbeitsplatz", { hasChildren: true }), entry("ruhe", "Ruhebereich")],
  },
  arbeitsplatz: {
    entry: entry("arbeitsplatz", "Fahrerarbeitsplatz", { hasChildren: true }),
    children: [entry("lenkrad", "Lenkrad")],
  },
  ungenutzt: {
    entry: entry("ungenutzt", "Ungenutzt", { hasChildren: true, hidden: true }),
    children: [entry("chat", "Chat")],
  },
};

const loader = (levels: Record<string, MenuLevel | null>) =>
  jest.fn(async (id?: string) => levels[id ?? ""] ?? null);

describe("fetchStartPointOptions", () => {
  it("bietet jeden Eintrag mit Unterpunkten an, eingerückt in Menüreihenfolge", async () => {
    const options = await fetchStartPointOptions(loader(tree));

    expect(options).toEqual([
      { id: "root", title: "Hauptmenü" },
      { id: "technik", title: `${INDENT}Technik im Detail` },
      { id: "fahrerhaus", title: `${INDENT.repeat(2)}Fahrerhaus` },
      { id: "arbeitsplatz", title: `${INDENT.repeat(3)}Fahrerarbeitsplatz` },
      { id: "ungenutzt", title: `${INDENT}Ungenutzt${HIDDEN_SUFFIX}` },
    ]);
  });

  it("fragt die Einträge einer Ebene gleichzeitig ab", async () => {
    const pending: Array<() => void> = [];
    const load = jest.fn(
      (id?: string) =>
        new Promise<MenuLevel | null>((resolve) => {
          pending.push(() => resolve(tree[id ?? ""] ?? null));
        }),
    );

    const result = fetchStartPointOptions(load);
    await Promise.resolve();
    pending.shift()?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Beide Kinder des Hauptmenüs mit Unterpunkten sind unterwegs, bevor eines antwortet.
    expect(load.mock.calls.map(([id]) => id)).toEqual([undefined, "technik", "ungenutzt"]);
    while (pending.length > 0) {
      pending.shift()?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    await expect(result).resolves.toHaveLength(5);
  });

  it("behält einen Eintrag, dessen Ebene nicht zu laden war, ohne seine Unterpunkte", async () => {
    const options = await fetchStartPointOptions(loader({ ...tree, technik: null }));

    expect(options.map((option) => option.id)).toEqual(["root", "technik", "ungenutzt"]);
  });

  it("liefert eine leere Liste, wenn schon das Hauptmenü fehlt", async () => {
    await expect(fetchStartPointOptions(loader({}))).resolves.toEqual([]);
  });

  it("schickt nie mehr Anfragen zugleich als erlaubt", async () => {
    const wide: Record<string, MenuLevel> = {
      "": {
        entry: entry("root", "Hauptmenü"),
        children: Array.from({ length: 20 }, (_, index) => entry(`f${index}`, `Ordner ${index}`, { hasChildren: true })),
      },
    };
    let open = 0;
    let peak = 0;
    const load = jest.fn(async (id?: string) => {
      open++;
      peak = Math.max(peak, open);
      await new Promise((resolve) => setTimeout(resolve, 0));
      open--;
      return wide[id ?? ""] ?? null;
    });

    const options = await fetchStartPointOptions(load);

    expect(peak).toBe(MAX_PARALLEL_REQUESTS);
    expect(load).toHaveBeenCalledTimes(21);
    expect(options).toHaveLength(21);
  });

  it("hört nach der Obergrenze an Anfragen auf", async () => {
    const wide: Record<string, MenuLevel> = {
      "": {
        entry: entry("root", "Hauptmenü"),
        children: Array.from({ length: MAX_LEVEL_REQUESTS * 2 }, (_, index) =>
          entry(`f${index}`, `Ordner ${index}`, { hasChildren: true }),
        ),
      },
    };
    const load = loader(wide);

    await fetchStartPointOptions(load);

    expect(load).toHaveBeenCalledTimes(MAX_LEVEL_REQUESTS);
  });

  it("läuft in einem Menü, das sich selbst enthält, nicht im Kreis", async () => {
    const loop: Record<string, MenuLevel> = {
      "": { entry: entry("root", "Hauptmenü"), children: [entry("a", "A", { hasChildren: true })] },
      a: { entry: entry("a", "A", { hasChildren: true }), children: [entry("a", "A", { hasChildren: true })] },
    };

    await expect(fetchStartPointOptions(loader(loop))).resolves.toEqual([
      { id: "root", title: "Hauptmenü" },
      { id: "a", title: `${INDENT}A` },
    ]);
  });
});
