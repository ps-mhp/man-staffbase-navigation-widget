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

import type { MenuLevelLoader } from "@shared/staffbase/menu-tree";

import { StartPointTree, loadStartPointTree } from "./start-point-tree";

export type StartPointTreeState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; tree: StartPointTree };

/**
 * Das Menü für die Seitenleiste, einmal beim Öffnen geladen. Scheitert
 * schon das Hauptmenü, fragt `retry` neu – `fetchMenuLevel` behält keinen
 * Fehlschlag.
 */
export function useStartPointTree(load: MenuLevelLoader): { state: StartPointTreeState; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<StartPointTreeState>({ status: "loading" });

  useEffect(() => {
    let current = true;
    setState({ status: "loading" });
    loadStartPointTree(load).then(
      (tree) => {
        if (current) setState(tree === null ? { status: "error" } : { status: "ready", tree });
      },
      () => {
        if (current) setState({ status: "error" });
      },
    );
    return () => {
      current = false;
    };
  }, [load, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { state, retry };
}
