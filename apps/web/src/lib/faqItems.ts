/** FAQ topics in display order, each with the keys of its `faq.items.*` messages. Shared by the page and its FAQPage JSON-LD. */
export const FAQ_GROUPS = [
  { key: 'basics', items: ['what', 'cost', 'addresses'] },
  { key: 'scoring', items: ['score', 'walkDrive', 'missing', 'facilities', 'radius'] },
  { key: 'data', items: ['data', 'accuracy'] },
] as const;

/** Every `faq.items.*` key, in display order. */
export const FAQ_ITEM_KEYS = FAQ_GROUPS.flatMap((group) => group.items);
