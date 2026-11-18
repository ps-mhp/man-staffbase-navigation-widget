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
 * Das Fenster „Startpunkt wählen“ im gemeinsamen Rahmen von
 * `@man/config-ui`, eingehängt in einen echten RJSF-Dialog: Ausgangsstand aus
 * dem alten Feld, Übernehmen nach `navigation-config`, Prüfung, Ausblenden
 * nur im eigenen Dialog, Nachladen des Editors.
 */

import * as React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import Form from "@rjsf/mui";
import validator from "@rjsf/validator-ajv8";

import * as menu from "@shared/staffbase/menu";
import { modalRoot, settleModal } from "@shared/ui/config-modal.testing";

import { configurationSchema } from "./configuration-schema";
import { readNavigationConfig, serializeNavigationConfig } from "./navigation-config";
import { navigationEditorShell, startNavigationDialog } from "./navigation-dialog";
import { MENU, ids, levelLoader } from "./start-point-tree.testing";

const mockEditorLoaded = jest.fn();
jest.mock("./navigation-editor", () => {
  mockEditorLoaded();
  return jest.requireActual("./navigation-editor");
});

beforeEach(() => {
  menu.clearMenuCache();
  jest.spyOn(menu, "fetchMenuLevel").mockImplementation(levelLoader(MENU));
});

afterEach(() => {
  jest.restoreAllMocks();
});

const ownField = (container: HTMLElement, key: string): HTMLInputElement =>
  container.querySelector<HTMLInputElement>(`#navigation [id="root_${key}"]`)!;

const inModal = (selector: string): HTMLElement | null => modalRoot()?.querySelector<HTMLElement>(selector) ?? null;

const buttonNamed = (name: string): HTMLElement | null =>
  Array.from(modalRoot()?.querySelectorAll<HTMLElement>("button") ?? []).find(
    (button) => button.textContent?.trim() === name || button.getAttribute("aria-label") === name,
  ) ?? null;

const rowNamed = (title: string): HTMLElement | null =>
  Array.from(modalRoot()?.querySelectorAll<HTMLElement>('[role="row"]') ?? []).find((row) =>
    row.textContent?.startsWith(title),
  ) ?? null;

const applyButton = (): HTMLElement | null => inModal('[data-testid="config-shell-apply"]');

/** Ein Klick wie von Hilfsmitteln: react-aria nimmt ihn als Druck an. */
async function click(element: Element | null): Promise<void> {
  if (element === null) throw new Error("Nichts zum Klicken gefunden");
  await act(async () => {
    (element as HTMLElement).click();
  });
}

/** Das Modal lädt nach, der Editor darin noch einmal, dann das Menü: so oft warten, bis alles da ist. */
async function settleEditor(): Promise<void> {
  for (let round = 0; round < 8 && inModal('[role="treegrid"]') === null; round += 1) {
    await settleModal();
  }
  await settleModal();
}

/** Der eigene Dialog neben dem des Hotspots, der auch ein Feld `menu-id` führt. */
function Dialogs({ formData }: { formData: Record<string, string> }): React.ReactElement {
  return (
    <>
      <div id="navigation">
        <Form schema={configurationSchema} validator={validator} formData={formData} />
      </div>
      <form id="hotspot">
        <div data-row="config">
          <label htmlFor="root_config">Hotspot</label>
          <input id="root_config" defaultValue="" />
        </div>
        <div data-row="menu-id">
          <label htmlFor="root_menu-id">Startpunkt</label>
          <input id="root_menu-id" defaultValue="fremd" />
        </div>
      </form>
    </>
  );
}

async function open(formData: Record<string, string>): Promise<{ container: HTMLElement; stop: () => void }> {
  const { container } = render(<Dialogs formData={formData} />);
  let stop = (): void => {};
  await act(async () => {
    stop = startNavigationDialog(container);
  });
  await settleEditor();
  return { container, stop };
}

describe("Nachladen", () => {
  // Muss zuerst laufen: einmal geladen, bleibt das Modul im Speicher.
  it("lädt den Editor erst, wenn der eigene Dialog erscheint – nicht beim Dialog des Hotspots", async () => {
    const container = document.createElement("div");
    container.innerHTML = '<form><input id="root_config"><input id="root_menu-id" value="fremd"></form>';
    document.body.append(container);
    const stop = startNavigationDialog(container);
    await settleModal();

    expect(mockEditorLoaded).not.toHaveBeenCalled();
    expect(modalRoot()).toBeNull();
    await act(async () => stop());
    container.remove();

    const opened = await open({});
    expect(mockEditorLoaded).toHaveBeenCalledTimes(1);
    await click(buttonNamed("Editor")); // das Fenster öffnet in „Desktop“
    expect(inModal('[data-testid="navigation-editor"]')).not.toBeNull();
    await act(async () => opened.stop());
  });
});

describe("startNavigationDialog", () => {
  it("öffnet das Fenster im gemeinsamen Rahmen mit Vorschau-Umschalter und dem Menü als Baum", async () => {
    const { stop } = await open({});

    expect(modalRoot()!.textContent).toContain("Navigation");
    expect(modalRoot()!.querySelector("h1")).toHaveTextContent("Startpunkt wählen");
    expect(inModal('[aria-label="Ansicht"]')).not.toBeNull();
    expect(inModal('[role="treegrid"][aria-label="Menü"]')).toHaveTextContent("Hauptmenü");
    expect(inModal("aside h2")).toHaveTextContent("Startpunkt im Menü");

    await act(async () => stop());
  });

  it("blendet das alte Feld nur im eigenen Dialog aus", async () => {
    const { container, stop } = await open({});

    expect(ownField(container, "menu-id").closest<HTMLElement>('[style*="display: none"]')).not.toBeNull();
    expect(container.querySelector<HTMLElement>('#hotspot [data-row="menu-id"]')?.style.display).toBe("");
    expect(container.querySelector<HTMLElement>("#hotspot")?.style.display).toBe("");

    await act(async () => stop());
    expect(ownField(container, "menu-id").closest('[style*="display: none"]')).toBeNull();
  });

  // Pflicht: Öffnen und Übernehmen darf keinen bestehenden Block verändern.
  it("beginnt bei einem alten Block mit menu-id, ohne etwas zu schreiben", async () => {
    const address = `https://www.mti.man/content/page/${ids.standorte}`;
    const { container, stop } = await open({ "menu-id": address });

    expect(applyButton()).toBeDisabled();
    await click(buttonNamed("Editor")); // das Fenster öffnet in „Desktop“
    expect(rowNamed("Standorte")).toHaveAttribute("aria-selected", "true");
    expect(inModal('[data-testid="navigation-heading"]')).toHaveTextContent("Standorte");
    expect(ownField(container, "navigation-config").value).toBe("");
    expect(ownField(container, "menu-id").value).toBe(address);

    await act(async () => stop());
  });

  it("schreibt einen gewählten Startpunkt nach navigation-config und lässt menu-id stehen", async () => {
    const { container, stop } = await open({ "menu-id": ids.standorte });

    await click(rowNamed("Service"));
    expect(inModal('[role="status"]')).toHaveTextContent("Startpunkt geändert");
    await click(applyButton());

    expect(readNavigationConfig(ownField(container, "navigation-config").value)).toEqual({ menuId: ids.service });
    expect(ownField(container, "menu-id").value).toBe(ids.standorte);

    await act(async () => stop());
  });

  it("nimmt eine vorhandene navigation-config vor dem alten Feld", async () => {
    const config = serializeNavigationConfig({ menuId: ids.arbeiten });
    const { stop } = await open({ "navigation-config": config, "menu-id": ids.standorte });

    expect(rowNamed("Arbeiten bei MAN")).toHaveAttribute("aria-selected", "true");
    expect(rowNamed("Standorte")).toBeNull(); // Unternehmen ist zugeklappt: der Weg führt nicht dorthin.

    await act(async () => stop());
  });

  it("übernimmt nichts ohne Startpunkt und sagt, was fehlt", async () => {
    const { container, stop } = await open({});

    await click(rowNamed("Kontakt")); // eine Seite ohne Unterpunkte: nicht wählbar
    expect(applyButton()).toBeDisabled();

    await click(buttonNamed("Desktop"));
    await click(buttonNamed("Editor"));
    expect(inModal('[data-testid="navigation-heading"]')).toHaveTextContent("Noch kein Startpunkt gewählt");

    await click(rowNamed("Unternehmen"));
    await click(applyButton());
    expect(readNavigationConfig(ownField(container, "navigation-config").value)).toEqual({ menuId: ids.unternehmen });

    await act(async () => stop());
  });

  it("setzt eine eingetragene Adresse als ID und weist Unlesbares ab", async () => {
    const { container, stop } = await open({});

    await click(buttonNamed("ID oder Adresse eingeben"));
    const input = inModal('[role="group"][aria-label="ID oder Adresse eingeben"] input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Standorte" } });
    await click(buttonNamed("Als Startpunkt setzen"));
    expect(inModal('[role="group"] [role="alert"]')).toHaveTextContent("keine Menü-ID");

    const outside = "ffffffffffffffffffffffff";
    fireEvent.change(input, { target: { value: `https://www.mti.man/content/page/${outside.toUpperCase()}` } });
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });
    await settleModal();

    expect(inModal('[role="group"][aria-label="ID oder Adresse eingeben"]')).toBeNull();
    // Nicht im Menü: oben im Baum, damit die Auswahl nicht ins Leere zeigt.
    expect(inModal('[role="row"][aria-selected="true"]')).toHaveTextContent("nicht im geladenen Menü");
    await click(applyButton());
    expect(readNavigationConfig(ownField(container, "navigation-config").value)).toEqual({ menuId: outside });

    await act(async () => stop());
  });

  it("klappt die Eingabe mit Escape zu, statt das Fenster zu schließen", async () => {
    const { stop } = await open({});

    await click(buttonNamed("ID oder Adresse eingeben"));
    const input = inModal('[role="group"] input') as HTMLInputElement;
    await act(async () => {
      fireEvent.keyDown(input, { key: "Escape" });
    });

    expect(inModal('[role="group"][aria-label="ID oder Adresse eingeben"]')).toBeNull();
    expect(inModal('[data-testid="config-shell"]')).not.toBeNull();

    await act(async () => stop());
  });

  it("leert mit Escape erst die Suche, statt das Fenster zu schließen", async () => {
    const { stop } = await open({});
    const search = inModal('input[type="search"]') as HTMLInputElement;

    fireEvent.change(search, { target: { value: "münch" } });
    await settleModal();
    expect(rowNamed("München")).not.toBeNull();
    expect(rowNamed("Service")).toBeNull();

    await act(async () => {
      fireEvent.keyDown(search, { key: "Escape" });
    });

    expect(search.value).toBe("");
    expect(inModal('[data-testid="config-shell"]')).not.toBeNull();

    await act(async () => stop());
  });

  it("öffnet in der Desktop-Ansicht, dem Ziel-Screen", async () => {
    const { stop } = await open({ "menu-id": ids.standorte });

    expect(modalRoot()!.querySelector('[role="radio"][aria-checked="true"]')).toHaveTextContent("Desktop");
    expect(inModal('[data-testid="navigation-preview"]')).not.toBeNull();

    await act(async () => stop());
  });

  it("zeigt in den Geräteansichten die echte Leiste, still und ohne Klick", async () => {
    const { stop } = await open({ "menu-id": ids.standorte });

    await click(buttonNamed("Desktop"));
    await settleModal();

    const preview = inModal('[data-testid="navigation-preview"]');
    expect(preview).toHaveAttribute("inert");
    expect(preview?.querySelector("nav")).toHaveAccessibleName("Standorte");
    expect(preview?.querySelector("nav")).toHaveTextContent("München");
    expect(inModal('[data-testid="navigation-preview-page"]')).toHaveTextContent("Standorte");
    // Der Baum bleibt daneben, damit man umschalten und weiter wählen kann.
    expect(inModal('[role="treegrid"][aria-label="Menü"]')).not.toBeNull();

    await act(async () => stop());
  });
});

describe("navigationEditorShell", () => {
  it("verlangt einen lesbaren Startpunkt", () => {
    const validate = navigationEditorShell.validate!;

    expect(validate({})).toEqual([{ id: "start-point", message: expect.stringContaining("Startpunkt fehlt") }]);
    expect(validate({ menuId: "Standorte" })).toEqual([
      { id: "start-point", message: expect.stringContaining("keine Menü-ID") },
    ]);
    expect(validate({ menuId: ids.standorte })).toEqual([]);
  });

  it("nennt im Status einen geänderten Startpunkt", () => {
    const statusText = navigationEditorShell.statusText!;

    expect(statusText({ menuId: ids.service }, { menuId: ids.standorte })).toBe("Startpunkt geändert");
    expect(statusText({ menuId: ids.standorte }, { menuId: ids.standorte })).toBeUndefined();
  });

  it("erklärt in der Hilfe Baum, Suche, verborgene Einträge und den Weg von Hand", () => {
    const { container } = render(<>{navigationEditorShell.help}</>);

    expect(container).toHaveTextContent("Wählbar sind Menüpunkte mit Unterpunkten");
    expect(container).toHaveTextContent("Die Suche über dem Baum");
    expect(container).toHaveTextContent("im Menü verborgen");
    expect(container).toHaveTextContent("ID oder Adresse eingeben");
  });
});
