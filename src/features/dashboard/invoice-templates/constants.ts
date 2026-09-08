/** Longest a merchant-chosen template name may be. */
export const TEMPLATE_NAME_MAX_LENGTH = 60;

/**
 * The `mutatingId` a create reports, since the server has not minted an id yet.
 *
 * A sentinel rather than null, so "a template is being created" and "nothing is
 * happening" stay tellable apart. It can never collide with a real id, which
 * are server-minted.
 */
export const NEW_TEMPLATE_ID = "__new__";

/**
 * How long a deleted template can be brought back.
 *
 * The DELETE is held for this window rather than issued and undone by
 * re-creating: a re-create mints a NEW templateId, and any invoice carrying the
 * old one in `invoice.templateId` would be silently orphaned. Holding the
 * request means undo is genuinely the same template.
 */
export const DELETE_UNDO_MS = 5000;

/** Above this many templates, the list offers a filter field. */
export const SEARCH_THRESHOLD = 8;

export const TEMPLATE_SORTS = [
  { id: "recent", label: "Recently used" },
  { id: "created", label: "Recently saved" },
  { id: "name", label: "Name (A–Z)" },
] as const;

export type TemplateSortId = (typeof TEMPLATE_SORTS)[number]["id"];
