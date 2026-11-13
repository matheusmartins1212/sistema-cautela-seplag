import { z } from "zod";

/** Query da listagem de notificações do usuário autenticado. */
export const listNotificationsQuerySchema = z.object({
  onlyUnread: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
