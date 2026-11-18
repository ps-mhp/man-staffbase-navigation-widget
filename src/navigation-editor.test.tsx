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
 * Der Rumpf des Fensters ohne Rahmen: Zustände des Baums, Auswahl und was
 * die Mitte über den Startpunkt sagt.
 */

import * as React from "react";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { MenuLevel } from "@shared/staffbase/menu";

import type { NavigationConfig } from "./navigation-config";
import { NavigationEditor } from "./navigation-editor";
import { MENU, ids, levelLoader } from "./start-point-tree.testing";

function renderEditor(value: NavigationConfig, load = levelLoader(MENU)) {
  const onChange = jest.fn();
  const view = render(<NavigationEditor value={value} onChange={onChange} loadLevel={load} />);
  return { ...view, onChange, load };
}

const tree = (): Promise<HTMLElement> => screen.findByRole("treegrid", { name: "Menü" });

const row = (title: string): HTMLElement | undefined =>
  screen.queryAllByRole("row").find((element) => element.textContent?.startsWith(title));

describe("NavigationEditor", () => {
  it("zeigt das Menü als Baum, offen bis zum Startpunkt, mit Unterzeilen wie im Entwurf", async () => {
    renderEditor({ menuId: ids.standorte });

    const menu = await tree();
    expect(within(menu).getByText("Hauptmenü")).toBeInTheDocument();
    expect(row("Standorte")).toHaveAttribute("aria-selected", "true");
    expect(row("Standorte")).toHaveTextContent("2 Unterpunkte · Startpunkt");
    expect(row("Strategie")).toHaveTextContent("Seite");
    // Service ist zu: sein verborgenes Archiv steht noch nicht da.
    expect(row("Archiv")).toBeUndefined();
  });

  it("wählt einen Eintrag mit Unterpunkten und übergeht Seiten ohne", async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor({ menuId: ids.standorte });
    await tree();

    await user.click(row("Strategie")!);
    expect(onChange).not.toHaveBeenCalled();

    await user.click(row("Arbeiten bei MAN")!);
    expect(onChange).toHaveBeenCalledWith({ menuId: ids.arbeiten });
  });

  it("sagt in der Mitte, welcher Startpunkt gilt und wo er im Menü steht", async () => {
    renderEditor({ menuId: `https://www.mti.man/content/page/${ids.standorte}` });
    await tree();

    const heading = screen.getByTestId("navigation-heading");
    expect(within(heading).getByRole("heading", { level: 2 })).toHaveTextContent("Standorte");
    expect(heading).toHaveTextContent("Startpunkt · 2 Unterpunkte");
    expect(heading).toHaveTextContent("Hauptmenü › Unternehmen › Standorte");
    expect(heading).toHaveTextContent(ids.standorte);
    expect(await screen.findByRole("navigation", { name: "Standorte" })).toHaveTextContent("München");
  });

  it("weist auf einen im Menü verborgenen Startpunkt hin", async () => {
    const hidden: Record<string, MenuLevel> = {
      ...MENU,
      [ids.service]: { ...MENU[ids.service], entry: { ...MENU[ids.service].entry, hidden: true } },
      "": {
        ...MENU[""],
        children: MENU[""].children.map((child) => (child.id === ids.service ? { ...child, hidden: true } : child)),
      },
    };
    renderEditor({ menuId: ids.service }, levelLoader(hidden));
    await tree();

    expect(screen.getByText(/Der Startpunkt ist im Menü verborgen/)).toBeInTheDocument();
    expect(row("Service")).toHaveTextContent("im Menü verborgen");
  });

  it("zeigt einen Startpunkt, der nicht zu laden ist, mit seiner ID ganz oben", async () => {
    const outside = "ffffffffffffffffffffffff";
    renderEditor({ menuId: outside });
    await tree();

    expect(await screen.findByText("Startpunkt · nicht zu laden")).toBeInTheDocument();
    expect(screen.getAllByRole("row")[0]).toHaveTextContent(`${outside}Startpunkt · nicht im geladenen Menü`);
  });

  it("ohne Startpunkt: sagt, wo man wählt", async () => {
    renderEditor({});
    await tree();

    expect(screen.getByTestId("navigation-heading")).toHaveTextContent("Noch kein Startpunkt gewählt");
    expect(screen.getByTestId("navigation-heading")).toHaveTextContent("Links im Menü einen Menüpunkt wählen");
  });

  it("zeigt das Laden und bietet nach einem Fehler einen neuen Versuch", async () => {
    const user = userEvent.setup();
    let release: (level: MenuLevel | null) => void = () => undefined;
    const load = jest.fn((id?: string) =>
      id === undefined || id === ""
        ? new Promise<MenuLevel | null>((resolve) => {
            release = resolve;
          })
        : Promise.resolve(MENU[id] ?? null),
    );
    renderEditor({}, load as unknown as ReturnType<typeof levelLoader>);

    expect(screen.getByText("Menü wird geladen …")).toBeInTheDocument();
    await act(async () => release(null));
    expect(await screen.findByText("Das Menü konnte nicht geladen werden.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    await act(async () => release(MENU[""]));

    expect(await tree()).toBeInTheDocument();
  });
});
