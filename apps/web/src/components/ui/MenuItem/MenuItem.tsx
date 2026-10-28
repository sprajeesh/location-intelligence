// Shared styling for rows in a popover menu (layer picker, language picker).
// The active row gets a slight tint and a dot at the end marking the selection.

const MENU_ITEM_BASE =
  "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors duration-150 focus-ring-inset";

export function menuItemClasses(active: boolean): string {
  return `${MENU_ITEM_BASE} ${
    active
      ? "text-primary-600 bg-primary-50 active:bg-primary-100"
      : "text-slate-700 hover:text-slate-900 hover:bg-slate-50 active:bg-slate-100"
  }`;
}

export function MenuItemDot() {
  return (
    <span aria-hidden="true" className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-500" />
  );
}
