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

import { setPublicPathFromBundle } from "@shared/public-path";

// Muss vor jedem dynamischen `import()` laufen, damit nachgeladene Teile von
// dem CDN kommen, von dem das Bundle stammt, und nicht von der Wirtsseite.
setPublicPathFromBundle("navigation-widget.js");
import React, { ReactElement } from "react";
import ReactDOM from "react-dom/client";

import { BlockAttributes, BlockFactory, BlockDefinition, ExternalBlockDefinition, BaseBlock } from "widget-sdk";
import { startWidget } from "@shared/dev-mode/start-widget";
import { startEntityPickerInjector } from "@shared/entity-picker/entity-picker-injector";
import { readMenuId } from "@shared/staffbase/menu";
import { getTranslationRegistry } from "@shared/translation/registry";
import { HEADING_ATTRIBUTE, MENU_ID_ATTRIBUTE, configurationSchema, uiSchema } from "./configuration-schema";
import { NavigationMenu } from "./navigation-menu";
import { fetchStartPointOptions } from "./start-point-catalog";
import { NAVIGATION_WIDGET_TAG, navigationTranslationProvider, readHeading } from "./translation-provider";
import icon from "../resources/navigation-widget.svg";
import pkg from "../package.json";

/** Attribute kommen immer als Zeichenkette an; die Namen tragen Bindestriche wie im Schema. */
export type NavigationWidgetProps = BlockAttributes & {
  [MENU_ID_ATTRIBUTE]?: string;
  [HEADING_ATTRIBUTE]?: string;
};

export const NavigationWidget = (props: NavigationWidgetProps): ReactElement => (
  <NavigationMenu startId={readMenuId(props[MENU_ID_ATTRIBUTE])} heading={readHeading(props[HEADING_ATTRIBUTE])} />
);

/** Aus denselben Konstanten wie das Schema — ein Tippfehler wäre sonst ein stumm leeres Attribut. */
const widgetAttributes: string[] = [MENU_ID_ATTRIBUTE, HEADING_ATTRIBUTE];

const START_POINT_LABELS = {
  placeholder: "Startpunkt auswählen …",
  manualOption: "Andere Menü-ID eingeben …",
  unavailableNotice:
    "Das Menü konnte nicht geladen werden. Bitte die Adresse der Seite oder die Menü-ID eintragen.",
};

const factory: BlockFactory = (BaseBlockClass, _widgetApi) => {
  return class NavigationWidgetBlock extends BaseBlockClass implements BaseBlock {
    private _root: ReactDOM.Root | null = null;

    public renderBlock(container: HTMLElement): void {
      const attrs = this.parseAttributes<NavigationWidgetProps>();
      this._root ??= ReactDOM.createRoot(container);
      this._root.render(<NavigationWidget {...attrs} />);
    }

    public unmountBlock(_container: HTMLElement): void {
      this._root?.unmount();
      this._root = null;
    }

    public static get observedAttributes(): string[] {
      return widgetAttributes;
    }

    public attributeChangedCallback(...args: [string, string | undefined, string | undefined]): void {
      super.attributeChangedCallback.apply(this, args);
    }
  };
};

const blockDefinition: BlockDefinition = {
  name: NAVIGATION_WIDGET_TAG,
  factory: factory,
  attributes: widgetAttributes,
  blockLevel: "block",
  configurationSchema: configurationSchema,
  uiSchema: uiSchema,
  label: "Navigation",
  iconUrl: icon,
};

const externalBlockDefinition: ExternalBlockDefinition = {
  blockDefinition,
  author: pkg.author,
  version: pkg.version,
};

/**
 * Meldet den Baustein bei der Wirtsseite an — über `startWidget`, das zuerst
 * fragt, ob ein lokaler Entwicklungsserver übernimmt. Auswahlliste und
 * Übersetzung hängen am Anmelden, nicht am Laden: sonst belegte das
 * installierte Bundle das Feld, bevor feststeht, welches Bundle gilt (siehe
 * `hotspot-image-widget`).
 *
 * Die Abfrage davor lässt das Modul in Jest laden, wo es keine Wirtsseite gibt.
 */
if (typeof window.defineBlock === "function") {
  void startWidget({
    name: NAVIGATION_WIDGET_TAG,
    version: pkg.version,
    register: () => {
      startEntityPickerInjector({
        fieldKey: MENU_ID_ATTRIBUTE,
        fetchOptions: () => fetchStartPointOptions(),
        labels: START_POINT_LABELS,
      });
      getTranslationRegistry().register(navigationTranslationProvider);
      window.defineBlock(externalBlockDefinition);
    },
  });
}
