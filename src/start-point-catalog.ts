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
 * Die Startpunkte, die der Dialog anbietet: jeder Menüeintrag mit Unterpunkten,
 * als eingerückter Baum in einer einzigen Auswahlliste.
 *
 * Die API liefert je Anfrage nur eine Ebene; der Baum entsteht deshalb Ebene
 * für Ebene, innerhalb einer Ebene mehrere Anfragen zugleich. In der
 * Truck-Instanz sind das 31 Anfragen in rund 0,3 s (06.10.2026). Die
 * Obergrenze schützt vor einem Menü, das größer ist als jede Auswahlliste
 * sinnvoll fassen kann — was darüber hinausgeht, erreicht die Redaktion über
 * die Eingabe der Adresse.
 */

import { EntityOption } from "@shared/entity-picker/entity-catalog";
import { MenuEntry, MenuLevel, fetchMenuLevel } from "@shared/staffbase/menu";

/** Höchstens so viele Ebenen fragt der Dialog ab. */
export const MAX_LEVEL_REQUESTS = 150;

/** So tief steigt die Liste höchstens hinab. */
export const MAX_DEPTH = 8;

/**
 * So viele Anfragen laufen höchstens gleichzeitig — wie viele ein Browser
 * ohnehin je Herkunft offen hält. Mehr wären nur ein Stau, und ein Ordner mit
 * hundert Unterordnern soll keinen Schwall an den Server schicken.
 */
export const MAX_PARALLEL_REQUESTS = 6;

/**
 * Die Einrückung je Ebene. Ein Geviertleerzeichen, weil der Browser
 * gewöhnliche Leerzeichen am Anfang einer Option zusammenzieht.
 */
export const INDENT = "\u2003";

export const HIDDEN_SUFFIX = " (im Menü verborgen)";

type LevelLoader = (id?: string) => Promise<MenuLevel | null>;

/** `Promise.all(items.map(load))`, aber nie mehr als {@link MAX_PARALLEL_REQUESTS} zugleich. */
async function loadAll(ids: string[], load: LevelLoader): Promise<Array<MenuLevel | null>> {
  const results: Array<MenuLevel | null> = new Array(ids.length).fill(null);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < ids.length) {
      const index = next++;
      results[index] = await load(ids[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL_REQUESTS, ids.length) }, worker));
  return results;
}

/**
 * Alle Ebenen, die sich innerhalb der Grenzen laden lassen, nach ID.
 * Die Wurzel steht unter ihrer echten ID — sie ist selbst wählbar.
 */
async function loadTree(load: LevelLoader): Promise<{ root: MenuLevel; levels: Map<string, MenuLevel> } | null> {
  const root = await load();
  if (root === null) return null;

  const levels = new Map<string, MenuLevel>([[root.entry.id, root]]);
  let frontier: MenuEntry[] = root.children.filter((child) => child.hasChildren);
  let requests = 1;

  for (let depth = 1; depth < MAX_DEPTH && frontier.length > 0 && requests < MAX_LEVEL_REQUESTS; depth++) {
    const batch = frontier.filter((entry) => !levels.has(entry.id)).slice(0, MAX_LEVEL_REQUESTS - requests);
    requests += batch.length;
    const loaded = await loadAll(batch.map((entry) => entry.id), load);
    const next: MenuEntry[] = [];
    loaded.forEach((level, index) => {
      if (level === null) return;
      levels.set(batch[index].id, level);
      next.push(...level.children.filter((child) => child.hasChildren));
    });
    frontier = next;
  }
  return { root, levels };
}

function toOptions(entry: MenuEntry, depth: number, levels: Map<string, MenuLevel>, seen: Set<string>): EntityOption[] {
  if (!entry.hasChildren || seen.has(entry.id)) return [];
  seen.add(entry.id);
  const option: EntityOption = {
    id: entry.id,
    title: `${INDENT.repeat(depth)}${entry.title}${entry.hidden ? HIDDEN_SUFFIX : ""}`,
  };
  const children = levels.get(entry.id)?.children ?? [];
  return [option, ...children.flatMap((child) => toOptions(child, depth + 1, levels, seen))];
}

/**
 * Die Liste für den Dialog, in Menüreihenfolge und nach Tiefe eingerückt.
 * Leer, wenn schon das Hauptmenü nicht zu laden ist — dann bleibt die Eingabe
 * von Hand.
 */
export async function fetchStartPointOptions(load: LevelLoader = fetchMenuLevel): Promise<EntityOption[]> {
  const tree = await loadTree(load);
  if (tree === null) return [];
  const root: MenuEntry = { ...tree.root.entry, hasChildren: tree.root.children.length > 0 };
  return toOptions(root, 0, tree.levels, new Set());
}
