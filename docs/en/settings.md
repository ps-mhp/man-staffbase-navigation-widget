# Settings

The navigation has two settings: the starting point and **Sticky**. Both are
configured in the **Select Starting Point** window. The settings dialog itself contains only the
button that opens it.

| Setting | Description |
| --- | --- |
| Starting Point in the Menu (Tree on the Left) | The menu item displayed by the bar on the left; its subitems appear to the right of it. Required. The tree displays the app’s menu: folders showing the number of their subitems, pages, and menu items hidden in the menu indicated by a crossed-out eye. Only menu items with subitems can be selected; pages without subitems are provided for orientation. The search field above finds menu items by their title. The selected starting point is highlighted and displays “Starting Point” in its subline. |
| Enter ID or Address | Bottom left. Only necessary if the menu item is missing from the tree or the menu fails to load: enter the full address of its page or the 24-digit ID and click **Set as Starting Point**. The widget retrieves the ID automatically. |
| Sticky (Right, Behavior) | Default: on. When the bar reaches the main menu while scrolling, it stays below it instead of scrolling out of view — so the navigation remains available at the bottom of the page. Off: the bar scrolls with the page. In Studio and in the window's preview it always stays in place. |

The order, titles, and visibility of the entries come from the app’s menu
and are managed there, not in the widget.

## Notes

- **Apply** is only available if something has changed and a
  starting point has been selected. Otherwise, the status bar at the top indicates what is missing.
- **Apply** updates the settings dialog; changes are not saved until you
  click **Save** there.
- At the top are the views **Editor**, **Desktop**, **Tablet**, and
  **Mobile**. The Editor view displays the selected starting point with its path in the menu
  and its ID, with the toolbar below it. The Desktop, Tablet, and Mobile views display the
  toolbar at device width, just as the page shows it—it cannot be clicked
  in the preview. The tree remains displayed next to it.
- Undo and Redo are at the top of the window (⌘/Ctrl Z and
  ⇧⌘/Ctrl Z, respectively).
- Navigation elements set up before the window was opened retain their
  start point. The window displays it upon opening; nothing changes until
  a different start point is selected and applied.
