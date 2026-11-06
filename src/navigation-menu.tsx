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

import React, { useId, useRef, useState } from "react";

import { useHotStyle } from "@shared/hot-style";
import { MenuEntry, MenuLevel, fetchMenuLevel, readMenuId } from "@shared/staffbase/menu";

import { MenuDropdown } from "./menu-dropdown";
import { Chevron, EntryLink, MESSAGES, StatusMessage } from "./menu-parts";
import navigationCss from "./styles/navigation-menu.scss";
import { DropdownRequest, useDropdown } from "./use-dropdown";
import { LevelLoader, LevelState, useMenuLevel } from "./use-menu-level";
import { useOverflow } from "./use-overflow";

export { MESSAGES } from "./menu-parts";

export interface NavigationMenuProps {
  /** `null`, solange kein Startpunkt gewählt ist. */
  startId: string | null;
  /**
   * Der Menüeintrag der Seite, auf der das Widget steht — er ist rot
   * unterstrichen. Ohne Angabe aus der Adresse gelesen (`/content/page/{id}`).
   */
  currentId?: string | null;
  /** Nur für Tests. */
  loadLevel?: LevelLoader;
}

/**
 * Die Leseadresse einer Seite trägt die ID ihres Menüeintrags, dieselbe, unter
 * der die Navigation ihn führt (geprüft 06.10.2026: `/content/page/{menuId}`).
 */
const currentMenuId = (): string | null => readMenuId(window.location.pathname);

/** Was ein Auslöser über sein Dropdown wissen muss. */
interface TriggerProps {
  expanded: boolean;
  controls: string;
  onToggle: (trigger: HTMLElement) => void;
}

/**
 * `aria-controls` nur, solange das Dropdown da ist — ein Verweis auf ein
 * fehlendes Element wäre für Screenreader ein Loch.
 */
const controlsWhileOpen = ({ expanded, controls }: TriggerProps): string | undefined => (expanded ? controls : undefined);

/** Der Pfeil neben einem Titel, der eine Seite hat. */
function ArrowButton({ label, ...trigger }: TriggerProps & { label: string }): React.JSX.Element {
  return (
    <button
      type="button"
      className="man-nav__open"
      aria-label={label}
      aria-expanded={trigger.expanded}
      aria-controls={controlsWhileOpen(trigger)}
      onClick={(event) => trigger.onToggle(event.currentTarget)}
    >
      <Chevron direction="down" />
    </button>
  );
}

interface BarItemProps {
  entry: MenuEntry;
  current: boolean;
  trigger: TriggerProps;
}

/**
 * Ein Unterpunkt: der Titel führt auf die Seite, der Pfeil öffnet die
 * Unterpunkte. Ein reiner Ordner hat keine Seite — bei ihm öffnet der ganze
 * Eintrag das Dropdown.
 */
function BarItem({ entry, current, trigger }: BarItemProps): React.JSX.Element {
  const itemClass = current ? "man-nav__item man-nav__item--current" : "man-nav__item";
  if (entry.href === null) {
    return (
      <li className={itemClass}>
        <button
          type="button"
          className="man-nav__folder"
          aria-expanded={trigger.expanded}
          aria-controls={controlsWhileOpen(trigger)}
          onClick={(event) => trigger.onToggle(event.currentTarget)}
        >
          <span className="man-nav__title">{entry.title}</span>
          <Chevron direction="down" />
        </button>
      </li>
    );
  }
  return (
    <li className={itemClass}>
      <EntryLink entry={entry} className="man-nav__link" current={current ? "page" : undefined} />
      {entry.hasChildren && <ArrowButton label={MESSAGES.openChildren(entry.title)} {...trigger} />}
    </li>
  );
}

interface StartPointProps {
  entry: MenuEntry;
  current: boolean;
  /** Ohne weitere sichtbare Geschwister: `null`, kein Pfeil. */
  trigger: TriggerProps | null;
}

function StartPoint({ entry, current, trigger }: StartPointProps): React.JSX.Element {
  const startClass = current ? "man-nav__start man-nav__item--current" : "man-nav__start";
  return (
    <div className={startClass}>
      {entry.href === null ? (
        <span className="man-nav__start-title">
          <span className="man-nav__title">{entry.title}</span>
        </span>
      ) : (
        <EntryLink entry={entry} className="man-nav__link" current={current ? "page" : undefined} />
      )}
      {trigger !== null && <ArrowButton label={MESSAGES.openSiblings(entry.title)} {...trigger} />}
    </div>
  );
}

/**
 * Der Startpunkt bekommt einen Pfeil, wenn es neben ihm noch etwas zu sehen
 * gibt — mit denselben Maßstäben wie das Dropdown, das reine Ordner auslässt.
 */
const hasSiblings = (parent: LevelState, startId: string): boolean =>
  parent.status === "ready" &&
  parent.level.children.some((child) => !child.hidden && child.href !== null && child.id !== startId);

/**
 * Die horizontale Leiste: links der Startpunkt, rechts davon seine
 * Unterpunkte in einem waagerecht scrollenden Streifen, am Ende ‹ › für den
 * Fall, dass der Streifen nicht reicht.
 */
export function NavigationMenu({
  startId,
  currentId = currentMenuId(),
  loadLevel = fetchMenuLevel,
}: NavigationMenuProps): React.JSX.Element {
  const liveCss = useHotStyle(navigationCss, "navigation-widget", "styles/navigation-menu.scss");

  if (startId === null) {
    return (
      <div className="man-nav">
        <style>{liveCss}</style>
        <p className="man-nav__status">{MESSAGES.noStartPoint}</p>
      </div>
    );
  }
  // Der Schlüssel schließt Dropdowns und vergisst Geladenes, wenn die Redaktion
  // einen anderen Startpunkt wählt.
  return <NavigationBar key={startId} css={liveCss} startId={startId} currentId={currentId} loadLevel={loadLevel} />;
}

interface NavigationBarProps {
  css: string;
  startId: string;
  currentId: string | null;
  loadLevel: LevelLoader;
}

function NavigationBar({ css, startId, currentId, loadLevel }: NavigationBarProps): React.JSX.Element {
  const [loaded] = useState(() => new Map<string, MenuLevel>());
  const rootRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  const start = useMenuLevel(startId, loadLevel, loaded);
  const startLevel = start.status === "ready" ? start.level : null;
  // Das Elternteil gleich mitladen: erst seine Kinder sagen, ob der Startpunkt
  // einen Pfeil bekommt.
  const parent = useMenuLevel(startLevel?.parentId ?? null, loadLevel, loaded);

  const children = startLevel?.children.filter((child) => !child.hidden) ?? [];
  const [overflow, scroll] = useOverflow(scrollerRef, children.length);
  const dropdown = useDropdown(rootRef, scrollerRef);

  const controlsId = (entryId: string): string => `${baseId}-${entryId}`;
  const triggerFor = (forId: string, request: Omit<DropdownRequest, "forId" | "trigger">): TriggerProps => ({
    expanded: dropdown.open?.forId === forId,
    controls: controlsId(forId),
    onToggle: (trigger) => dropdown.toggle({ ...request, forId, trigger }),
  });

  return (
    <nav className="man-nav" aria-label={startLevel?.entry.title ?? MESSAGES.fallbackLabel} ref={rootRef}>
      <style>{css}</style>
      {startLevel === null ? (
        <StatusMessage state={start} />
      ) : (
        <div className="man-nav__bar">
          <StartPoint
            entry={startLevel.entry}
            current={startId === currentId}
            trigger={
              startLevel.parentId !== null && hasSiblings(parent, startId)
                ? triggerFor(startId, {
                    levelId: startLevel.parentId,
                    markId: startId,
                    label: MESSAGES.openSiblings(startLevel.entry.title),
                  })
                : null
            }
          />
          {children.length > 0 && (
            <>
              <span className="man-nav__divider" aria-hidden="true" />
              <div className="man-nav__scroller" ref={scrollerRef}>
                <ul className="man-nav__list">
                  {children.map((entry) => (
                    <BarItem
                      key={entry.id}
                      entry={entry}
                      current={entry.id === currentId}
                      trigger={triggerFor(entry.id, {
                        levelId: entry.id,
                        markId: null,
                        label: MESSAGES.openChildren(entry.title),
                      })}
                    />
                  ))}
                </ul>
              </div>
              {overflow.overflowing && (
                <div className="man-nav__scroll">
                  <button
                    type="button"
                    className="man-nav__scroll-button"
                    aria-label={MESSAGES.scrollBack}
                    aria-disabled={overflow.atStart}
                    onClick={() => !overflow.atStart && scroll(-1)}
                  >
                    <Chevron direction="left" />
                  </button>
                  <button
                    type="button"
                    className="man-nav__scroll-button"
                    aria-label={MESSAGES.scrollForward}
                    aria-disabled={overflow.atEnd}
                    onClick={() => !overflow.atEnd && scroll(1)}
                  >
                    <Chevron direction="right" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {dropdown.open !== null && (
        <MenuDropdown
          key={dropdown.open.forId}
          id={controlsId(dropdown.open.forId)}
          request={dropdown.open}
          currentId={currentId}
          loadLevel={loadLevel}
          loaded={loaded}
          rootRef={rootRef}
          panelRef={dropdown.panelRef}
        />
      )}
    </nav>
  );
}
