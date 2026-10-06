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

// Ein Modul, kein Skript: sonst teilten sich die Testdateien aller Widgets einen
// Namensraum, und `mockStartWidget` stieße mit dem des Hotspot-Widgets zusammen.
export {};

const mockStartWidget = jest.fn().mockResolvedValue(undefined);
const mockStartPicker = jest.fn(() => () => undefined);
const mockRegisterTranslation = jest.fn(() => () => undefined);

jest.mock("@shared/dev-mode/start-widget", () => ({ startWidget: mockStartWidget }));
jest.mock("@shared/entity-picker/entity-picker-injector", () => ({ startEntityPickerInjector: mockStartPicker }));
jest.mock("@shared/translation/registry", () => ({
  getTranslationRegistry: () => ({ register: mockRegisterTranslation }),
}));

interface Host {
  defineBlock: jest.Mock;
}

describe("Anmeldung des Widgets", () => {
  it("startet Auswahlliste und Übersetzung erst beim Anmelden, nicht schon beim Laden", async () => {
    const host = window as unknown as Host;
    host.defineBlock = jest.fn();

    jest.resetModules();
    await import("./index");

    expect(mockStartPicker).not.toHaveBeenCalled();
    expect(mockRegisterTranslation).not.toHaveBeenCalled();

    const options = mockStartWidget.mock.calls[0][0] as { name: string; register: () => void };
    expect(options.name).toBe("navigation-widget");
    options.register();

    expect(mockStartPicker).toHaveBeenCalledWith(expect.objectContaining({ fieldKey: "menu-id" }));
    expect(mockRegisterTranslation).toHaveBeenCalled();
    expect(host.defineBlock).toHaveBeenCalledWith(
      expect.objectContaining({
        blockDefinition: expect.objectContaining({ name: "navigation-widget", attributes: ["menu-id", "heading"] }),
      }),
    );
  });
});
