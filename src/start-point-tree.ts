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
 * Das Menü als Baum für die Seitenleiste „Startpunkt im Menü“.
 *
 * Geladen wird wie für die bisherige Auswahlliste (`menu-start-points.ts`):
 * Ebene für Ebene, mit denselben Grenzen für Tiefe und Anzahl der Anfragen.
 * Anders als dort bleiben Seiten ohne Unterpunkte und verborgene Einträge
 * im Baum – man sieht das Menü, wie es ist. Wählbar sind aber weiter nur
 * Einträge mit Unterpunkten: nur sie füllen eine Leiste.
 *
 * Die Ebenen kommen über `fetchMenuLevel`, dessen Ablage seitenweit gilt;
 * die Vorschau fragt dieselben Ebenen danach nicht noch einmal.
 */

import { EyeOff, ExternalLink, FileQuestion } from "lucide-react";
import type { TreeNode } from "@man/config-ui/sidebar/reorder";
import { MenuEntry, MenuLevel, fetchMenuLevel } from "@shared/staffbase/menu";
import { MAX_DEPTH, MAX_LEVEL_REQUESTS } from "@shared/staffbase/menu-start-points";
import { MenuLevelLoader, loadLevelsInParallel } from "@shared/staffbase/menu-tree";

export interface StartPointNode {
  entry: MenuEntry;
  /** In Menüreihenfolge, verborgene und Seiten eingeschlossen. */
  children: StartPointNode[];
  /** Falsch, wenn der Eintrag Unterpunkte hat, deren Ebene nicht geladen wurde. */
  loaded: boolean;
}

export interface StartPointLocation {
  node: StartPointNode;
  /** Vom Hauptmenü bis zu diesem Eintrag, beide eingeschlossen. */
  path: StartPointNode[];
}

export interface StartPointTree {
  root: StartPointNode;
  index: Map<string, StartPointLocation>;
}

/** Alle Ebenen innerhalb der Grenzen, nach ID; `null`, wenn das Hauptmenü fehlt. */
async function loadLevels(load: MenuLevelLoader): Promise<{ root: MenuLevel; levels: Map<string, MenuLevel> } | null> {
  const root = await load().catch(() => null);
  if (root === null) return null;

  const levels = new Map<string, MenuLevel>([[root.entry.id, root]]);
  let frontier = root.children.filter((child) => child.hasChildren);
  let requests = 1;

  for (let depth = 1; depth < MAX_DEPTH && frontier.length > 0 && requests < MAX_LEVEL_REQUESTS; depth++) {
    const batch = [...new Set(frontier.map((entry) => entry.id))]
      .filter((id) => !levels.has(id))
      .slice(0, MAX_LEVEL_REQUESTS - requests);
    requests += batch.length;
    const loaded = await loadLevelsInParallel(batch, load);
    const next: MenuEntry[] = [];
    loaded.forEach((level, position) => {
      if (level === null) return;
      levels.set(batch[position], level);
      next.push(...level.children.filter((child) => child.hasChildren));
    });
    frontier = next;
  }
  return { root, levels };
}

function buildIndex(root: StartPointNode): Map<string, StartPointLocation> {
  const index = new Map<string, StartPointLocation>();
  const visit = (node: StartPointNode, parentPath: StartPointNode[]): void => {
    const path = [...parentPath, node];
    index.set(node.entry.id, { node, path });
    node.children.forEach((child) => visit(child, path));
  };
  visit(root, []);
  return index;
}

/**
 * Lädt das Menü bis zu den Grenzen der bisherigen Auswahlliste.
 * `null`, wenn schon das Hauptmenü nicht zu laden ist.
 */
export async function loadStartPointTree(load: MenuLevelLoader = fetchMenuLevel): Promise<StartPointTree | null> {
  const loaded = await loadLevels(load);
  if (loaded === null) return null;
  const { root, levels } = loaded;

  // Ein Eintrag, der zweimal im Menü hängt, erscheint nur beim ersten Mal –
  // sonst liefe ein Kreis im Menü endlos.
  const seen = new Set<string>();
  const build = (entry: MenuEntry): StartPointNode => {
    seen.add(entry.id);
    const level = levels.get(entry.id);
    const children = (level?.children ?? []).filter((child) => !seen.has(child.id));
    children.forEach((child) => seen.add(child.id));
    return {
      entry,
      children: children.map(build),
      loaded: level !== undefined || !entry.hasChildren,
    };
  };
  // Das Hauptmenü trägt keine `childrenIds`; ob es Unterpunkte hat, sagen seine Kinder.
  const rootNode = build({ ...root.entry, hasChildren: root.children.length > 0 });
  return { root: rootNode, index: buildIndex(rootNode) };
}

/** Nur Einträge mit Unterpunkten füllen eine Leiste – wie in der bisherigen Auswahlliste. */
export function isSelectableStartPoint(tree: StartPointTree, id: string): boolean {
  return tree.index.get(id)?.node.entry.hasChildren === true;
}

const countText = (count: number): string => (count === 1 ? "1 Unterpunkt" : `${count} Unterpunkte`);

function kindText(node: StartPointNode, isRoot: boolean): string {
  const { entry } = node;
  if (isRoot) return "Wurzel";
  if (!entry.hasChildren) return entry.external ? "Link" : "Seite";
  return node.loaded ? countText(node.children.length) : "Unterpunkte nicht geladen";
}

function describe(node: StartPointNode, isRoot: boolean, selected: boolean): string {
  return [kindText(node, isRoot), node.entry.hidden && "im Menü verborgen", selected && "Startpunkt"]
    .filter(Boolean)
    .join(" · ");
}

function toTreeNode(node: StartPointNode, selectedId: string | null, isRoot: boolean): TreeNode {
  const { entry } = node;
  const icon = entry.hidden ? EyeOff : entry.external && !entry.hasChildren ? ExternalLink : undefined;
  return {
    id: entry.id,
    label: entry.title,
    description: describe(node, isRoot, entry.id === selectedId),
    ...(icon === undefined ? {} : { icon }),
    // Mit `children` ist ein Knoten ein Ordner; Seiten ohne Unterpunkte bleiben Blätter.
    ...(entry.hasChildren ? { children: node.children.map((child) => toTreeNode(child, selectedId, false)) } : {}),
  };
}

/**
 * Die Knoten für `ItemTree`. Steht der Startpunkt nicht im geladenen Menü –
 * jenseits der Grenzen, für dieses Konto unsichtbar oder von Hand
 * eingetragen –, steht er ganz oben, damit die Auswahl nicht ins Leere zeigt.
 *
 * @param missingTitle sein Titel, soweit bekannt; sonst steht die ID da.
 */
export function toTreeNodes(tree: StartPointTree, selectedId: string | null, missingTitle?: string): TreeNode[] {
  const nodes = [toTreeNode(tree.root, selectedId, true)];
  if (selectedId === null || tree.index.has(selectedId)) return nodes;
  return [
    {
      id: selectedId,
      label: missingTitle ?? selectedId,
      description: "Startpunkt · nicht im geladenen Menü",
      icon: FileQuestion,
    },
    ...nodes,
  ];
}

/** Offen beim Öffnen: das Hauptmenü und der Weg zum Startpunkt. */
export function defaultExpandedIds(tree: StartPointTree, selectedId: string | null): string[] {
  const path = selectedId === null ? undefined : tree.index.get(selectedId)?.path;
  if (path === undefined) return [tree.root.entry.id];
  return path.slice(0, -1).map((node) => node.entry.id);
}

export interface FilteredNodes {
  nodes: TreeNode[];
  /** Ordner, die nur über Treffer darin bleiben: offen, sonst sähe man die Treffer nicht. */
  expand: string[];
}

const normalize = (text: string): string => text.trim().toLocaleLowerCase("de");

/**
 * Was die Suche übrig lässt: Treffer samt ihrem Weg. Ein passender Ordner
 * behält alle Kinder; gesucht wird meist der Startpunkt selbst.
 */
export function filterTreeNodes(nodes: readonly TreeNode[], query: string): FilteredNodes {
  const needle = normalize(query);
  if (needle === "") return { nodes: [...nodes], expand: [] };

  const visit = (node: TreeNode): FilteredNodes => {
    if (normalize(node.label).includes(needle)) return { nodes: [node], expand: [] };
    const inner = filterTreeNodes(node.children ?? [], query);
    if (inner.nodes.length === 0) return { nodes: [], expand: [] };
    return { nodes: [{ ...node, children: inner.nodes }], expand: [node.id, ...inner.expand] };
  };

  return nodes.map(visit).reduce<FilteredNodes>(
    (all, part) => ({ nodes: [...all.nodes, ...part.nodes], expand: [...all.expand, ...part.expand] }),
    { nodes: [], expand: [] },
  );
}
