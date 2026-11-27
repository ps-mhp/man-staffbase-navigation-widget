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
 * Der Rumpf des Fensters „Startpunkt wählen“ im gemeinsamen Rahmen von
 * `@man/config-ui`: links das Menü als Baum, in der Mitte der gewählte
 * Startpunkt mit seiner Leiste, in den Geräteansichten die Leiste in
 * Gerätebreite. Rechts im Inspektor steht „Sticky“ – dort in jeder Ansicht
 * erreichbar, auch in der Desktop-Ansicht, mit der das Fenster beginnt.
 *
 * Nur im Studio nachgeladen (`navigation-dialog.tsx`): er bringt react-aria
 * und Tailwind mit, und das hat im Seitenbündel, das jede Leserin lädt,
 * nichts verloren. Kopf, Übernehmen, Rückgängig und Rückfrage kommen vom
 * Rahmen.
 */

import * as React from "react";
import { SwitchRow } from "@man/config-ui/form/switch-row";
import { InspectorPanel } from "@man/config-ui/inspector/inspector-panel";
import { ConfigWorkspace } from "@man/config-ui/layout/config-workspace";
import { useConfigShell } from "@man/config-ui/shell/shell-context";
import { fetchMenuLevel, readMenuId } from "@shared/staffbase/menu";
import type { MenuLevelLoader } from "@shared/staffbase/menu-tree";

import { NavigationConfig, resolveSticky } from "./navigation-config";
import { NavigationPreview } from "./navigation-preview";
import { START_POINT_ISSUE, validateNavigationConfig } from "./start-point-rules";
import { StartPointOverview } from "./start-point-overview";
import { StartPointSidebar } from "./start-point-sidebar";
import { useSelectedEntry } from "./use-selected-entry";
import { useStartPointTree } from "./use-start-point-tree";

export interface NavigationEditorProps {
  value: NavigationConfig;
  onChange: (value: NavigationConfig) => void;
  /** Woher die Ebenen des Menüs kommen; offengelegt für Tests. */
  loadLevel?: MenuLevelLoader;
}

/** Die Meldung am Startpunkt, aber erst, wenn „Übernehmen“ an ihr gescheitert ist. */
function useStartPointIssue(value: NavigationConfig): string | undefined {
  const { issuesVisible } = useConfigShell();
  if (!issuesVisible) return undefined;
  return validateNavigationConfig(value).find((issue) => issue.id === START_POINT_ISSUE)?.message;
}

interface StickyInspectorProps {
  value: NavigationConfig;
  onChange: (value: NavigationConfig) => void;
}

/** Ob die Leiste beim Scrollen unter dem Hauptmenü stehen bleibt (`use-sticky.ts`); Standard an. */
function StickyInspector({ value, onChange }: StickyInspectorProps): React.ReactElement {
  return (
    <InspectorPanel title="Verhalten">
      <SwitchRow
        label="Sticky"
        hint="Beim Scrollen bleibt die Leiste unter dem Hauptmenü stehen – so ist sie auch am Ende der Seite erreichbar."
        checked={resolveSticky(value)}
        onCheckedChange={(sticky) => onChange({ ...value, sticky })}
        data-testid="navigation-sticky"
      />
    </InspectorPanel>
  );
}

export function NavigationEditor({ value, onChange, loadLevel = fetchMenuLevel }: NavigationEditorProps): React.ReactElement {
  const { state, retry } = useStartPointTree(loadLevel);
  const selectedId = readMenuId(value.menuId);
  const selected = useSelectedEntry(selectedId, state, loadLevel);
  const issue = useStartPointIssue(value);
  // In der Ansicht „Editor“ steht die Meldung am Kopf der Mitte; sonst links über dem Baum.
  const { view } = useConfigShell();
  const title = selected.status === "found" ? selected.entry.title : undefined;

  const select = (menuId: string): void => {
    if (menuId !== selectedId) onChange({ ...value, menuId });
  };

  return (
    <ConfigWorkspace
      sidebar={
        <StartPointSidebar
          state={state}
          onRetry={retry}
          selectedId={selectedId}
          selectedTitle={title}
          onSelect={select}
          issue={view === "editor" ? undefined : issue}
        />
      }
      inspector={<StickyInspector value={value} onChange={onChange} />}
      preview={<NavigationPreview config={value} pageTitle={title} loadLevel={loadLevel} />}
    >
      <StartPointOverview
        config={value}
        selected={selected}
        selectedId={selectedId}
        issue={issue}
        loadLevel={loadLevel}
      />
    </ConfigWorkspace>
  );
}
