import { z } from "zod";

export const createShiftSchema = z.object({
  title: z.string().max(255).optional(),
  description: z.string().nullable().optional().default(""),
  specialty_required: z.string().min(1, "Specialty is required").max(255),
  starts_at: z
    .string()
    .datetime({ offset: true })
    .describe("ISO 8601 datetime string"),
  ends_at: z
    .string()
    .datetime({ offset: true })
    .describe("ISO 8601 datetime string"),
  price: z.number().int().positive("Price must be greater than 0"),
  payment_timeframe: z.string().optional().default(""),
  viaticos: z.string().optional().default(''),
  shift_category: z.enum(["guardia", "consultorio", "ambulancia", "otro"]),
});

export const createShiftSchemaRefined = createShiftSchema.refine(
  (data) => new Date(data.ends_at) > new Date(data.starts_at),
  {
    message: "End date must be after start date",
    path: ["ends_at"],
  }
);

export type CreateShiftInput = z.infer<typeof createShiftSchemaRefined>;
