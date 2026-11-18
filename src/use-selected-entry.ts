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

import { useEffect, useState } from "react";

import type { MenuEntry } from "@shared/staffbase/menu";
import type { MenuLevelLoader } from "@shared/staffbase/menu-tree";

import type { StartPointTreeState } from "./use-start-point-tree";

export type SelectedEntry =
  | { status: "none" }
  | { status: "loading" }
  /** Nicht zu laden: gelöscht, für dieses Konto unsichtbar oder nie eine Menü-ID. */
  | { status: "missing" }
  | {
      status: "found";
      entry: MenuEntry;
      /** Titel vom Hauptmenü bis zum Eintrag; `null`, wenn er nicht im geladenen Baum steht. */
      path: readonly string[] | null;
      /** Unterpunkte im Menü, verborgene eingeschlossen; `null`, wenn unbekannt. */
      childCount: number | null;
    };

type Fetched = { id: string; entry: MenuEntry | null; childCount: number | null };

/**
 * Was über den gewählten Startpunkt bekannt ist – für Kopf und Vorschau.
 *
 * Aus dem Baum, wenn er dort steht; sonst einmal über `loadLevel`, dessen
 * Ablage die Vorschau gleich mitbenutzt.
 */
export function useSelectedEntry(
  selectedId: string | null,
  tree: StartPointTreeState,
  loadLevel: MenuLevelLoader,
): SelectedEntry {
  const location = selectedId !== null && tree.status === "ready" ? tree.tree.index.get(selectedId) : undefined;
  const needsFetch = selectedId !== null && location === undefined && tree.status !== "loading";
  const [fetched, setFetched] = useState<Fetched | null>(null);

  useEffect(() => {
    if (!needsFetch || selectedId === null) return undefined;
    let current = true;
    loadLevel(selectedId).then(
      (level) => {
        if (current) setFetched({ id: selectedId, entry: level?.entry ?? null, childCount: level?.children.length ?? null });
      },
      () => {
        if (current) setFetched({ id: selectedId, entry: null, childCount: null });
      },
    );
    return () => {
      current = false;
    };
  }, [needsFetch, selectedId, loadLevel]);

  if (selectedId === null) return { status: "none" };
  if (location !== undefined) {
    const { node, path } = location;
    return {
      status: "found",
      entry: node.entry,
      path: path.map((step) => step.entry.title),
      childCount: node.loaded ? node.children.length : null,
    };
  }
  if (fetched === null || fetched.id !== selectedId) return { status: "loading" };
  if (fetched.entry === null) return { status: "missing" };
  return { status: "found", entry: fetched.entry, path: null, childCount: fetched.childCount };
}
