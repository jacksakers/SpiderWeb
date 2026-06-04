import { z } from 'zod';

// ─── Per-element style sub-schema ────────────────────────────────────────────

const StyleSchema = z.object({
  color: z.string().optional(),
  backgroundColor: z.string().optional(),
  fontSize: z.string().optional(),
  fontFamily: z.string().optional(),
  fontWeight: z.string().optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  borderRadius: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
  border: z.string().optional(),
  boxShadow: z.string().optional(),
  padding: z.string().optional(),
});

// ─── Base fields shared by every element ────────────────────────────────────

const BaseElementSchema = z.object({
  type: z.enum(['text', 'image', 'shape', 'button', 'list', 'embed', 'group']),
  x: z.number(),
  y: z.number(),
  width: z.union([z.number(), z.literal('auto')]),
  height: z.union([z.number(), z.literal('auto')]),
  zIndex: z.number().int().min(0).max(999).optional(),
  rotation: z.number().min(-360).max(360).optional(),
  href: z.string().max(128).optional(),
  target: z.enum(['_self', '_blank']).optional(),
  sticky: z.boolean().optional(),
  style: StyleSchema.optional(),
});

// ─── Type-specific schemas ────────────────────────────────────────────────────

const TextElementSchema = BaseElementSchema.extend({
  type: z.literal('text'),
  // Plain string — NEVER rendered as HTML. Use [label](pageId) for inline links.
  content: z.string().max(4000),
});

const ImageElementSchema = BaseElementSchema.extend({
  type: z.literal('image'),
  // Accepts https URLs and blob: object URLs (local preview before Storage upload)
  src: z.string().max(1024),
  alt: z.string().max(256).optional(),
});

const ShapeElementSchema = BaseElementSchema.extend({
  type: z.literal('shape'),
  shape: z.enum(['rectangle', 'circle', 'triangle']).default('rectangle'),
});

const ButtonElementSchema = BaseElementSchema.extend({
  type: z.literal('button'),
  label: z.string().max(256),
});

const ListElementSchema = BaseElementSchema.extend({
  type: z.literal('list'),
  items: z.array(z.object({
    text: z.string().max(500),
    imageUrl: z.string().max(1024).optional(),
    link: z.string().max(128).optional(),
  })).max(50).default([]),
});

const EmbedElementSchema = BaseElementSchema.extend({
  type: z.literal('embed'),
  url: z.string().max(1024),
  embedType: z.enum(['youtube', 'spotify', 'soundcloud', 'generic']).optional(),
});

// ─── Group element (children are non-group elements only; no nested groups) ──

const NonGroupElementSchema = z.discriminatedUnion('type', [
  TextElementSchema,
  ImageElementSchema,
  ShapeElementSchema,
  ButtonElementSchema,
  ListElementSchema,
  EmbedElementSchema,
]);

const GroupElementSchema = BaseElementSchema.extend({
  type: z.literal('group'),
  children: z.record(z.string(), NonGroupElementSchema),
});

// ─── Union ───────────────────────────────────────────────────────────────────

const ElementSchema = z.discriminatedUnion('type', [
  TextElementSchema,
  ImageElementSchema,
  ShapeElementSchema,
  ButtonElementSchema,
  ListElementSchema,
  EmbedElementSchema,
  GroupElementSchema,
]);

// ─── Full page blueprint ─────────────────────────────────────────────────────

export const PageBlueprintSchema = z.object({
  ownerId:  z.string().max(128),
  title:    z.string().max(128),
  editors:  z.array(z.string().max(128)).optional(),
  isPublic: z.boolean().optional(),
  siteId:   z.string().max(128).optional(),
  siteTitle: z.string().max(128).optional(),
  theme: z.object({
    backgroundColor:    z.string().optional(),
    backgroundImage:    z.string().max(512).optional(),
    backgroundGradient: z.string().max(512).optional(),
    width:              z.number().default(1200),
    height:             z.number().default(2000),
  }),
  // Dictionary keyed by element ID — O(1) lookup/update/delete
  elements: z.record(z.string(), ElementSchema),
});

/**
 * Validates a page blueprint object before writing to Firestore.
 * Returns { success, data, error }.
 */
export function validateBlueprint(blueprint) {
  return PageBlueprintSchema.safeParse(blueprint);
}
