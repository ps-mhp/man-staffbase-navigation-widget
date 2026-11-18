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
 * Die linke Spalte im Fenster „Startpunkt wählen“: oben die Suche, darunter
 * das Menü als Baum, unten der Weg, eine ID oder Adresse einzutragen.
 *
 * Der Baum zeigt das Menü, wie es ist – Seiten und verborgene Einträge
 * eingeschlossen –, wählbar sind aber nur Einträge mit Unterpunkten: nur sie
 * füllen eine Leiste. Jeder Zustand ist zu sehen: Laden, Fehler mit „Erneut
 * versuchen“, keine Treffer. Eine stumm leere Spalte sähe aus wie ein
 * kaputtes Fenster.
 */

import * as React from "react";
import { Field } from "@man/config-ui/form/field";
import { IssueText } from "@man/config-ui/form/issue-text";
import { Button } from "@man/config-ui/primitives/button";
import { Input } from "@man/config-ui/primitives/input";
import { ItemTree } from "@man/config-ui/sidebar/item-tree";
import { SidebarPanel } from "@man/config-ui/sidebar/sidebar-panel";
import { SidebarSearch } from "@man/config-ui/sidebar/sidebar-search";
import { readMenuId } from "@shared/staffbase/menu";

import { START_POINT_MESSAGES } from "./start-point-rules";
import {
  StartPointTree,
  defaultExpandedIds,
  filterTreeNodes,
  isSelectableStartPoint,
  toTreeNodes,
} from "./start-point-tree";
import type { StartPointTreeState } from "./use-start-point-tree";

export const SIDEBAR_TITLE = "Startpunkt im Menü";
const SEARCH_LABEL = "Menüpunkt suchen";
const MANUAL_LABEL = "ID oder Adresse eingeben";
const NOTE = "px-3 py-6 text-center text-[13px] text-muted-foreground";

export interface StartPointSidebarProps {
  state: StartPointTreeState;
  onRetry: () => void;
  /** Der Startpunkt als ID; `null` ohne lesbaren. */
  selectedId: string | null;
  /** Sein Titel, soweit bekannt – für einen Startpunkt außerhalb des geladenen Menüs. */
  selectedTitle?: string;
  /** Bekommt die ID eines wählbaren Eintrags oder einer eingetragenen Adresse. */
  onSelect: (menuId: string) => void;
  /** Die Meldung am Startpunkt, sobald „Übernehmen“ an ihr gescheitert ist. */
  issue?: string;
}

function RetryNote({ onRetry }: { onRetry: () => void }): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-3 px-3 py-6 text-center">
      <p role="alert" className="text-[13px] text-destructive">
        Das Menü konnte nicht geladen werden.
      </p>
      <Button type="button" variant="outline" size="sm" className="h-10" onClick={onRetry}>
        Erneut versuchen
      </Button>
      <p className="text-[13px] text-muted-foreground">Oder unten eine ID oder Adresse eingeben.</p>
    </div>
  );
}

interface MenuTreeProps {
  tree: StartPointTree;
  query: string;
  selectedId: string | null;
  selectedTitle?: string;
  onSelect: (menuId: string) => void;
}

/**
 * Offen beim Öffnen: das Hauptmenü und der Weg zum Startpunkt. Danach gilt,
 * was man selbst auf- und zuklappt; Treffer der Suche stehen offen, solange
 * gesucht wird, gemerkt werden sie nicht.
 */
function MenuTree({ tree, query, selectedId, selectedTitle, onSelect }: MenuTreeProps): React.ReactElement {
  const [expandedIds, setExpandedIds] = React.useState<string[]>(() => defaultExpandedIds(tree, selectedId));
  const nodes = React.useMemo(() => toTreeNodes(tree, selectedId, selectedTitle), [tree, selectedId, selectedTitle]);
  const filtered = React.useMemo(() => filterTreeNodes(nodes, query), [nodes, query]);
  const expanded = React.useMemo(() => [...new Set([...expandedIds, ...filtered.expand])], [expandedIds, filtered.expand]);
  const handleExpanded = (ids: string[]): void =>
    setExpandedIds(ids.filter((id) => !filtered.expand.includes(id) || expandedIds.includes(id)));

  // Seiten ohne Unterpunkte stehen zur Orientierung da; eine Leiste füllen sie nicht.
  const select = (id: string): void => {
    if (isSelectableStartPoint(tree, id)) onSelect(id);
  };

  return (
    <ItemTree
      aria-label="Menü"
      nodes={filtered.nodes}
      selectedId={selectedId}
      onSelect={select}
      expandedIds={expanded}
      onExpandedChange={handleExpanded}
      emptyState={`Nichts gefunden zu „${query.trim()}“`}
    />
  );
}

interface ManualEntryProps {
  onSubmit: (menuId: string) => void;
}

/**
 * Der Ausweg, den schon der bisherige Dialog bot: fehlt ein Menüpunkt im
 * Baum – jenseits der Ladegrenzen, für dieses Konto unsichtbar oder das Menü
 * lädt nicht –, die Adresse seiner Seite oder die ID einfügen. Gesetzt wird
 * erst, was sich als Menü-ID lesen lässt, und dann die ID selbst.
 *
 * Kein `<form>`: das Fenster hängt im Formular des Staffbase-Dialogs, und
 * Enter soll dort nichts absenden. Escape klappt das Feld zu, statt das
 * Fenster zu schließen.
 */
function ManualEntry({ onSubmit }: ManualEntryProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string | undefined>(undefined);
  const toggleRef = React.useRef<HTMLButtonElement>(null);
  const returnFocus = React.useRef(false);

  React.useEffect(() => {
    if (open || !returnFocus.current) return;
    returnFocus.current = false;
    toggleRef.current?.focus();
  }, [open]);

  const close = (): void => {
    returnFocus.current = true;
    setOpen(false);
    setText("");
    setError(undefined);
  };

  const submit = (): void => {
    const id = readMenuId(text);
    if (id === null) {
      setError(text.trim() === "" ? "Bitte eine ID oder Adresse eintragen." : START_POINT_MESSAGES.unreadable);
      return;
    }
    onSubmit(id);
    close();
  };

  if (!open) {
    return (
      <Button
        ref={toggleRef}
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-3 h-10 text-[13px] font-semibold"
        onClick={() => setOpen(true)}
      >
        {MANUAL_LABEL}
      </Button>
    );
  }

  return (
    <div role="group" aria-label={MANUAL_LABEL} className="flex flex-col gap-3">
      <Field label="ID oder Adresse" hint="Die komplette Adresse der Seite oder die 24-stellige ID." error={error}>
        <Input
          autoFocus
          value={text}
          placeholder="https://… oder 6a7358…"
          className="h-10 bg-background"
          onChange={(event) => {
            setText(event.target.value);
            setError(undefined);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            } else if (event.key === "Escape") {
              event.preventDefault();
              close();
            }
          }}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" className="h-10" onClick={submit}>
          Als Startpunkt setzen
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-10" onClick={close}>
          Abbrechen
        </Button>
      </div>
    </div>
  );
}

export function StartPointSidebar({
  state,
  onRetry,
  selectedId,
  selectedTitle,
  onSelect,
  issue,
}: StartPointSidebarProps): React.ReactElement {
  const [query, setQuery] = React.useState("");
  return (
    <SidebarPanel title={SIDEBAR_TITLE} footer={<ManualEntry onSubmit={onSelect} />}>
      {state.status === "ready" && <SidebarSearch aria-label={SEARCH_LABEL} value={query} onValueChange={setQuery} />}
      {issue !== undefined && <IssueText className="px-2 pb-3">{issue}</IssueText>}
      {state.status === "loading" && (
        <p role="status" className={NOTE}>
          Menü wird geladen …
        </p>
      )}
      {state.status === "error" && <RetryNote onRetry={onRetry} />}
      {state.status === "ready" && (
        <MenuTree
          tree={state.tree}
          query={query}
          selectedId={selectedId}
          selectedTitle={selectedTitle}
          onSelect={onSelect}
        />
      )}
    </SidebarPanel>
  );
}
