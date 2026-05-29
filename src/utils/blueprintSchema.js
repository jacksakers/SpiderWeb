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
});

// ─── Base fields shared by every element ────────────────────────────────────

const BaseElementSchema = z.object({
  type: z.enum(['text', 'image', 'shape']),
  x: z.number(),
  y: z.number(),
  width: z.union([z.number(), z.literal('auto')]),
  height: z.union([z.number(), z.literal('auto')]),
  zIndex: z.number().int().min(0).max(999).optional(),
  rotation: z.number().min(-360).max(360).optional(),
  href: z.string().max(128).optional(),
  target: z.enum(['_self', '_blank']).optional(),
  style: StyleSchema.optional(),
});

// ─── Type-specific schemas ────────────────────────────────────────────────────

const TextElementSchema = BaseElementSchema.extend({
  type: z.literal('text'),
  // Plain string — NEVER rendered as HTML
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

// ─── Union ───────────────────────────────────────────────────────────────────

const ElementSchema = z.discriminatedUnion('type', [
  TextElementSchema,
  ImageElementSchema,
  ShapeElementSchema,
]);

// ─── Full page blueprint ─────────────────────────────────────────────────────

export const PageBlueprintSchema = z.object({
  ownerId:  z.string().max(128),
  title:    z.string().max(128),
  editors:  z.array(z.string().max(128)).optional(),
  isPublic: z.boolean().optional(),
  theme: z.object({
    backgroundColor: z.string().optional(),
    backgroundImage: z.string().max(512).optional(),
    width:           z.number().default(1200),
    height:          z.number().default(2000),
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
