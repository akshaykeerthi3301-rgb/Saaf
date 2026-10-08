import { z } from 'zod'

/**
 * The boundary for a résumé sent from the browser — shared by every action that
 * accepts one (download, live scoring), so the limits cannot drift apart.
 *
 * The client supplying the sections is safe where this is used for the reason
 * resume-download.ts documents: the text goes into a file or a score and comes
 * back to the same person, with no badge, no storage and no third party.
 */

const bullet = z.string().max(600)

export const sectionsSchema = z.object({
  contact: z.object({
    name: z.string().max(120).nullable(),
    email: z.string().max(200).nullable(),
    phone: z.string().max(60).nullable(),
    links: z.array(z.string().max(300)).max(6),
  }),
  summary: z.string().max(2000).nullable(),
  experience: z
    .array(
      z.object({
        title: z.string().max(200).nullable(),
        employer: z.string().max(200).nullable(),
        dates: z.string().max(80).nullable(),
        location: z.string().max(120).nullable(),
        bullets: z.array(bullet).max(20),
        /** Without this a project arrives as a job, and the export puts it under Experience. */
        isProject: z.boolean().optional(),
      }),
    )
    .max(15),
  education: z
    .array(
      z.object({
        qualification: z.string().max(300),
        institution: z.string().max(200).nullable(),
        dates: z.string().max(80).nullable(),
      }),
    )
    .max(10),
  skills: z.array(z.string().max(80)).max(80),
  other: z.array(z.object({ heading: z.string().max(80), lines: z.array(z.string().max(600)).max(20) })).max(8),
  unplaced: z.number(),
  order: z.array(z.string().max(40)).max(20),
})
