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
import { Chevron, EntryLink, MESSAGES, StatusMessage, dropdownEntries } from "./menu-parts";
import navigationCss from "./styles/navigation-menu.scss";
import { useSectionFit } from "./section-fit";
import { useSticky } from "./use-sticky";
import { ChildLevel, useChildLevels } from "./use-child-levels";
import { DropdownRequest, useDropdown } from "./use-dropdown";
import { LevelLoader, LevelState, useMenuLevel } from "./use-menu-level";
import { useCompact } from "./use-compact";
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
  /**
   * Ob die Leiste die Abstände ihres Abschnitts anpasst (`section-fit.ts`).
   * Falsch in der Vorschau des Fensters: dort gibt es keinen eigenen Abschnitt.
   */
  fitSection?: boolean;
  /**
   * Ob die Leiste beim Scrollen unter der Kopfzeile stehen bleibt
   * (`use-sticky.ts`). Ohne Angabe nicht: die Vorschau im Fenster klebt nie;
   * die Seite reicht den Wert aus `navigation-config` durch.
   */
  sticky?: boolean;
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
  /** Ohne etwas zu öffnen: `null`, kein Pfeil. */
  trigger: TriggerProps | null;
}

/**
 * Ein Unterpunkt: der Titel führt auf die Seite, der Pfeil öffnet die
 * Unterpunkte. Ein reiner Ordner hat keine Seite — bei ihm öffnet der ganze
 * Eintrag das Dropdown; hat er nichts zu öffnen, bleibt er Text.
 */
function BarItem({ entry, current, trigger }: BarItemProps): React.JSX.Element {
  if (entry.href === null) {
    if (trigger === null) {
      return (
        <li className="man-nav__item">
          <span className="man-nav__start-title">
            <span className="man-nav__title">{entry.title}</span>
          </span>
        </li>
      );
    }
    return (
      <li className="man-nav__item">
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
    <li className={current ? "man-nav__item man-nav__item--current" : "man-nav__item"}>
      <EntryLink entry={entry} className="man-nav__link" current={current ? "page" : undefined} />
      {trigger !== null && <ArrowButton label={MESSAGES.openChildren(entry.title)} {...trigger} />}
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
  return (
    <div className={current ? "man-nav__start man-nav__item--current" : "man-nav__start"}>
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
  parent.status === "ready" && dropdownEntries(parent.level, startId).some((child) => child.id !== startId);

/**
 * Ein Unterpunkt bekommt einen Pfeil, wenn sein Dropdown etwas zeigen würde.
 * Waren seine Kinder nicht zu laden, bleibt der Pfeil — das Dropdown meldet
 * den Fehler und bietet einen neuen Versuch.
 */
const opensSomething = (entry: MenuEntry, level: ChildLevel): boolean =>
  entry.hasChildren && (level === null || (level !== undefined && dropdownEntries(level, null).length > 0));

interface ChildPickerProps {
  /** Titel der geöffneten Seite; `null`, wenn sie nicht festzustellen ist. */
  currentTitle: string | null;
  trigger: TriggerProps;
}

/**
 * Auf schmalem Platz (`use-compact.ts`) die zweite Zeile: ein Knopf über die
 * ganze Breite, der die Unterpunkte des Startpunkts als Dropdown öffnet —
 * statt des waagerecht scrollenden Streifens (Vorgabe 27.11.2026). Er zeigt
 * die geöffnete Seite, wo sie auch im Menü steht.
 */
function ChildPicker({ currentTitle, trigger }: ChildPickerProps): React.JSX.Element {
  return (
    <div className={currentTitle === null ? "man-nav__pick" : "man-nav__pick man-nav__item--current"}>
      <button
        type="button"
        className="man-nav__picker"
        aria-expanded={trigger.expanded}
        aria-controls={controlsWhileOpen(trigger)}
        onClick={(event) => trigger.onToggle(event.currentTarget)}
      >
        <span className="man-nav__title">{currentTitle ?? MESSAGES.chooseChild}</span>
        <Chevron direction="down" />
      </button>
    </div>
  );
}

/**
 * Titel der geöffneten Seite für die Auswahl: ein Unterpunkt, der Startpunkt
 * selbst oder — tiefer im Menü — die eigens geladene Ebene der Seite.
 */
function useCurrentTitle(
  enabled: boolean,
  currentId: string | null,
  start: MenuLevel | null,
  children: readonly MenuEntry[],
  loadLevel: LevelLoader,
  loaded: Map<string, MenuLevel>,
): string | null {
  const known =
    currentId === null || start === null
      ? undefined
      : currentId === start.entry.id
        ? start.entry
        : children.find((child) => child.id === currentId);
  const elsewhere = enabled && start !== null && known === undefined ? currentId : null;
  const level = useMenuLevel(elsewhere, loadLevel, loaded);
  if (known !== undefined) return known.title;
  return level.status === "ready" ? level.level.entry.title : null;
}

/** Schlüssel des Dropdowns, das die zweite Zeile öffnet — keine Menü-ID kann so heißen. */
const pickerKey = (startId: string): string => `${startId}-children`;

/**
 * Die horizontale Leiste: links der Startpunkt, rechts davon seine
 * Unterpunkte in einem waagerecht scrollenden Streifen, am Ende ‹ › für den
 * Fall, dass der Streifen nicht reicht.
 */
export function NavigationMenu({
  startId,
  currentId = currentMenuId(),
  loadLevel = fetchMenuLevel,
  fitSection = true,
  sticky = false,
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
  return (
    <NavigationBar
      key={startId}
      css={liveCss}
      startId={startId}
      currentId={currentId}
      loadLevel={loadLevel}
      fitSection={fitSection}
      sticky={sticky}
    />
  );
}

interface NavigationBarProps {
  css: string;
  startId: string;
  currentId: string | null;
  loadLevel: LevelLoader;
  fitSection: boolean;
  sticky: boolean;
}

function NavigationBar({
  css,
  startId,
  currentId,
  loadLevel,
  fitSection,
  sticky,
}: NavigationBarProps): React.JSX.Element {
  const [loaded] = useState(() => new Map<string, MenuLevel>());
  const slotRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  const start = useMenuLevel(startId, loadLevel, loaded);
  const startLevel = start.status === "ready" ? start.level : null;
  // Das Elternteil gleich mitladen: erst seine Kinder sagen, ob der Startpunkt
  // einen Pfeil bekommt.
  const parent = useMenuLevel(startLevel?.parentId ?? null, loadLevel, loaded);

  const children = startLevel?.children.filter((child) => !child.hidden) ?? [];
  const childLevel = useChildLevels(
    children.filter((child) => child.hasChildren).map((child) => child.id),
    loadLevel,
    loaded,
  );
  const compact = useCompact(slotRef);
  const currentTitle = useCurrentTitle(compact, currentId, startLevel, children, loadLevel, loaded);
  const [overflow, scroll] = useOverflow(scrollerRef, compact ? 0 : children.length);
  const dropdown = useDropdown(rootRef, scrollerRef);
  useSectionFit(slotRef, fitSection);
  useSticky(slotRef, rootRef, sticky);

  const controlsId = (entryId: string): string => `${baseId}-${entryId}`;
  const triggerFor = (forId: string, request: Omit<DropdownRequest, "forId" | "trigger">): TriggerProps => ({
    expanded: dropdown.open?.forId === forId,
    controls: controlsId(forId),
    onToggle: (trigger) => dropdown.toggle({ ...request, forId, trigger }),
  });

  // Der Platzhalter steht immer im Fluss; klebt die Leiste, hält er ihre Höhe.
  return (
    <div className="man-nav-slot" ref={slotRef}>
      <nav className="man-nav" aria-label={startLevel?.entry.title ?? MESSAGES.fallbackLabel} ref={rootRef}>
        <style>{css}</style>
        {startLevel === null ? (
          <StatusMessage state={start} />
        ) : (
          <div className={compact ? "man-nav__bar man-nav__bar--compact" : "man-nav__bar"}>
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
            {children.length > 0 && compact && (
              <ChildPicker
                currentTitle={currentTitle}
                trigger={triggerFor(pickerKey(startId), {
                  levelId: startId,
                  markId: null,
                  label: MESSAGES.openChildren(startLevel.entry.title),
                  wide: true,
                })}
              />
            )}
            {children.length > 0 && !compact && (
              <>
                <span className="man-nav__divider" aria-hidden="true" />
                <div className="man-nav__scroller" ref={scrollerRef}>
                  <ul className="man-nav__list">
                    {children.map((entry) => (
                      <BarItem
                        key={entry.id}
                        entry={entry}
                        current={entry.id === currentId}
                        trigger={
                          opensSomething(entry, childLevel(entry.id))
                            ? triggerFor(entry.id, {
                                levelId: entry.id,
                                markId: null,
                                label: MESSAGES.openChildren(entry.title),
                              })
                            : null
                        }
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
    </div>
  );
}
