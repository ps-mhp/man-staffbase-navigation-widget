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

import { useEffect, useRef, useState } from "react";

import { MenuLevel } from "@shared/staffbase/menu";

import { LevelLoader } from "./use-menu-level";

/** Geladen, gescheitert (`null`) oder noch unterwegs (`undefined`). */
export type ChildLevel = MenuLevel | null | undefined;

/**
 * Lädt die Ebenen mehrerer Einträge auf einmal vorab — die der Unterpunkte
 * in der Leiste. Erst ihre Kinder sagen, ob ein Pfeil etwas zu öffnen hätte:
 * `childrenIds` zählt auch verborgene Einträge mit (live gesehen am
 * 06.11.2026). Was hier ankommt, landet in `loaded`, das Dropdown öffnet
 * danach ohne eigene Anfrage.
 */
export function useChildLevels(
  ids: readonly string[],
  load: LevelLoader,
  loaded: Map<string, MenuLevel>,
): (id: string) => ChildLevel {
  const [, setVersion] = useState(0);
  const failed = useRef(new Set<string>());
  const key = ids.join(",");

  useEffect(() => {
    let alive = true;
    const settle = (id: string, level: MenuLevel | null): void => {
      if (!alive) return;
      if (level === null) failed.current.add(id);
      else loaded.set(id, level);
      setVersion((version) => version + 1);
    };
    for (const id of key === "" ? [] : key.split(",")) {
      if (loaded.has(id) || failed.current.has(id)) continue;
      load(id).then(
        (level) => settle(id, level),
        () => settle(id, null),
      );
    }
    return () => {
      alive = false;
    };
  }, [key, load, loaded]);

  return (id) => loaded.get(id) ?? (failed.current.has(id) ? null : undefined);
}
