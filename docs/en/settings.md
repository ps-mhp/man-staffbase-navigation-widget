# Settings

The navigation bar has two settings: the starting point and **Sticky**. Both
are configured in the **Select Starting Point** window. The settings dialog itself contains only the
button that opens it.

| Setting | Description |
| --- | --- |
| Start Point in Menu (Tree on the Left) | The menu item displayed by the bar on the left; its subitems appear to the right of it. Required. The tree displays the app’s menu: folders with the number of their subitems, pages, and menu items hidden in the menu indicated by a crossed-out eye. Only menu items with subitems can be selected; pages without subitems are provided for orientation. The search field above finds menu items by their title. The selected starting point is highlighted and displays “Starting Point” in its subline. |
| Enter ID or Address | Bottom left. Only necessary if the menu item is missing from the tree or the menu fails to load: enter the full address of its page or the 24-digit ID and click **Set as Starting Point**. The widget retrieves the ID automatically. |
| Sticky (right, Behavior) | Default: On. When scrolling, if the bar reaches the main menu, it remains below it instead of scrolling out of view—this way, navigation remains accessible even at the bottom of the page. Off: The bar scrolls with the page. In Studio and in the window preview, it always stays in place. |

The order, titles, and visibility of the entries come from the app’s menu
and are managed there, not in the widget.

## Notes

- **Apply** is only available once a change has been made and a
  starting point has been selected. Otherwise, the status bar at the top indicates what is missing.
- **Apply** updates the settings dialog; changes are only saved when you click
  **Save** in the dialog.
- At the top are the views **Editor**, **Desktop**, **Tablet**, and
  **Mobile**. The Editor view shows the selected starting point with its path in the menu
  and its ID, with the toolbar below it. Desktop, Tablet, and Mobile views display the
  toolbar at the device’s width, just as the page displays it—it cannot be clicked
  in the preview. The tree remains next to it.
- Undo and Redo are located at the top of the window (⌘/Ctrl Z and
  ⇧⌘/Ctrl Z, respectively).
- Navigation elements set up before the window was opened retain their
  start point. The window displays it upon opening; nothing changes until
  a different start point is selected and applied.
