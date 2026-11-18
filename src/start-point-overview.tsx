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
 * Die Hauptfläche in der Ansicht „Editor“: welcher Startpunkt gilt und wie
 * die Leiste damit aussieht.
 *
 * Gewählt wird links im Baum; hier steht der Startpunkt nur zum Ablesen –
 * Titel als Überschrift, daneben was er ist, darunter sein Weg im Menü und
 * seine ID. Darunter die Leiste selbst, ohne Gerätrahmen; in Desktop, Tablet
 * und Mobil steht sie in Gerätebreite über einer angedeuteten Seite.
 */

import * as React from "react";
import { EyeOff, Info, TriangleAlert } from "lucide-react";
import { FormSection } from "@man/config-ui/form/form-section";

import type { NavigationConfig } from "./navigation-config";
import { NavigationPreview } from "./navigation-preview";
import type { LevelLoader } from "./use-menu-level";
import type { SelectedEntry } from "./use-selected-entry";

const HINT = "text-[13px] text-muted-foreground";

export interface StartPointOverviewProps {
  config: NavigationConfig;
  selected: SelectedEntry;
  /** Die ID des Startpunkts; `null` ohne lesbaren. */
  selectedId: string | null;
  /** Die Meldung am Startpunkt, sobald „Übernehmen“ an ihr gescheitert ist. */
  issue?: string;
  loadLevel?: LevelLoader;
}

const countText = (count: number): string => (count === 1 ? "1 Unterpunkt" : `${count} Unterpunkte`);

interface HeadingText {
  title: string;
  kicker: string;
}

function headingText(selected: SelectedEntry, selectedId: string | null, raw: string): HeadingText {
  switch (selected.status) {
    case "none":
      return raw.trim() === ""
        ? { title: "Noch kein Startpunkt gewählt", kicker: "Links im Menü einen Menüpunkt wählen" }
        : { title: raw.trim(), kicker: "Darin steht keine Menü-ID" };
    case "loading":
      return { title: selectedId ?? "", kicker: "Startpunkt wird geladen …" };
    case "missing":
      return { title: selectedId ?? "", kicker: "Startpunkt · nicht zu laden" };
    case "found": {
      const parts = [
        "Startpunkt",
        selected.childCount === null ? null : countText(selected.childCount),
        selected.path === null ? "nicht im geladenen Menü" : null,
      ];
      return { title: selected.entry.title, kicker: parts.filter(Boolean).join(" · ") };
    }
  }
}

function IssueText({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <p role="alert" className="flex items-start gap-1.5 text-[13px] text-destructive">
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** Ein Hinweis in grauem Kasten, wie `s-note` im Entwurf. */
function Note({ icon: Icon, children }: { icon: typeof Info; children: React.ReactNode }): React.ReactElement {
  return (
    <p className="flex items-start gap-2.5 rounded-md bg-secondary px-3.5 py-3 text-[13px] leading-normal text-muted-foreground">
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

function StartPointHeading({ config, selected, selectedId, issue }: StartPointOverviewProps): React.ReactElement {
  const { title, kicker } = headingText(selected, selectedId, config.menuId ?? "");
  const path = selected.status === "found" ? selected.path : null;
  return (
    <div className="flex flex-col gap-1.5" data-testid="navigation-heading">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-xl leading-[1.3] font-semibold break-all text-foreground">{title}</h2>
        <span className={HINT}>{kicker}</span>
      </div>
      {path !== null && path.length > 1 && (
        <p className={HINT}>
          <span className="sr-only">Weg im Menü: </span>
          {path.join(" › ")}
        </p>
      )}
      {selectedId !== null && selected.status === "found" && (
        <p className={HINT}>
          ID <span className="font-mono">{selectedId}</span>
        </p>
      )}
      {issue !== undefined && <IssueText>{issue}</IssueText>}
    </div>
  );
}

export function StartPointOverview(props: StartPointOverviewProps): React.ReactElement {
  const { config, selected, loadLevel } = props;
  const hidden = selected.status === "found" && selected.entry.hidden;
  return (
    <div className="flex max-w-[720px] flex-col gap-8 px-10 pt-6 pb-12" data-testid="navigation-editor">
      <StartPointHeading {...props} />
      {hidden && (
        <Note icon={EyeOff}>
          Der Startpunkt ist im Menü verborgen. Die Leiste zeigt ihn trotzdem; verborgene Unterpunkte zeigt sie nicht.
        </Note>
      )}
      <FormSection
        title="Leiste"
        description="So zeigt die Seite die Navigation. Ein Klick auf einen Titel öffnet dort die Seite, der Pfeil daneben die Unterpunkte."
      >
        <div className="overflow-hidden rounded-md border bg-background">
          <NavigationPreview config={config} withPage={false} loadLevel={loadLevel} />
        </div>
        <Note icon={Info}>
          Titel, Reihenfolge und Sichtbarkeit der Einträge kommen aus dem Menü der App und werden dort gepflegt.
        </Note>
      </FormSection>
    </div>
  );
}
