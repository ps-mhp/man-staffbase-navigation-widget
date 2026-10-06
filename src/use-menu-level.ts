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

import { useCallback, useEffect, useState } from "react";

import { MenuLevel } from "@shared/staffbase/menu";

export type LevelLoader = (id: string) => Promise<MenuLevel | null>;

export type LevelState =
  | { status: "loading" }
  | { status: "ready"; level: MenuLevel }
  | { status: "error"; retry: () => void };

interface Settled {
  key: string;
  level: MenuLevel | null;
}

/**
 * Eine Ebene des Menüs, geladen, sobald sie gebraucht wird.
 *
 * Was einmal da war, steht beim Zurückblättern sofort wieder da — ohne einen
 * Zwischenzustand „lädt“, der sonst für einen Augenblick aufblitzte, obwohl
 * die Antwort längst bereitliegt. Dafür merkt sich `loaded` jede geladene
 * Ebene; der Aufrufer hält die Ablage, damit er selbst darin nachsehen kann.
 * Ein Fehlschlag bleibt nicht hängen: `retry` fragt neu.
 */
export function useMenuLevel(id: string, load: LevelLoader, loaded: Map<string, MenuLevel>): LevelState {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);
  const [settledFor, setSettledFor] = useState(id);
  // Eine andere Ebene vergisst das Ergebnis der vorigen. Sonst stünde nach
  // einem Fehlschlag in A, dem Weg zurück und dem erneuten Öffnen von A sofort
  // wieder der alte Fehler da, obwohl längst neu gefragt wird.
  if (settledFor !== id) {
    setSettledFor(id);
    setSettled(null);
  }
  const key = `${id}#${attempt}`;
  const known = loaded.get(id);

  useEffect(() => {
    if (loaded.has(id)) return;
    let current = true;
    load(id).then(
      (level) => {
        if (!current) return;
        if (level !== null) loaded.set(id, level);
        setSettled({ key, level });
      },
      () => {
        if (current) setSettled({ key, level: null });
      },
    );
    return () => {
      current = false;
    };
  }, [id, key, load, loaded]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (known !== undefined) return { status: "ready", level: known };
  if (settled?.key !== key) return { status: "loading" };
  return settled.level === null ? { status: "error", retry } : { status: "ready", level: settled.level };
}
