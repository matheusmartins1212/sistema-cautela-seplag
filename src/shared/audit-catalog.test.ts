import { describe, expect, it } from "vitest";
import { AuditAction } from "@prisma/client";
import { AUDIT_ACTION_LABEL, AUDIT_GROUPS, auditGroupOf, describeAudit } from "./audit-catalog";

describe("catálogo da auditoria", () => {
  it("toda ação tem nome e cai em exatamente um grupo do filtro", () => {
    for (const action of Object.values(AuditAction)) {
      expect(AUDIT_ACTION_LABEL[action]).toBeTruthy();
      const groups = AUDIT_GROUPS.filter((g) => g.actions.includes(action));
      expect(groups, action).toHaveLength(1);
    }
    expect(auditGroupOf("AGENCY_DELETED")?.key).toBe("orgaos");
  });

  it("resume a remoção de órgão com quantos registros ainda o citavam", () => {
    expect(
      describeAudit("AGENCY_DELETED", {
        name: "SEFAZ - Secretaria de Estado de Fazenda",
        usersWithAgency: 2,
        requestsWithAgency: 1,
      }),
    ).toBe("SEFAZ - Secretaria de Estado de Fazenda (ainda citado em 2 contas e 1 solicitação)");
    expect(describeAudit("AGENCY_DELETED", { name: "X", usersWithAgency: 0 })).toBe("X");
  });

  it("descreve mudanças de conta e de órgão", () => {
    expect(describeAudit("USER_ROLE_CHANGED", { from: "USER", to: "ADMIN" })).toBe(
      "Usuário → Administrador",
    );
    expect(describeAudit("AGENCY_UPDATED", { name: "SES", from: true, to: false })).toBe(
      "Desativou: SES",
    );
    expect(
      describeAudit("USER_DRIVER_UPDATED", { from: false, to: true, licenseCategory: "AD" }),
    ).toBe("Habilitado como condutor, CNH AD");
    expect(describeAudit("VEHICLE_UPDATED", { changes: { plate: {}, notes: {} } })).toBe(
      "Alterou placa, observações",
    );
    expect(
      describeAudit("VEHICLE_UPDATED", {
        changes: {
          currentMileage: { from: 0, to: 1000 },
          plate: { from: "ABC1D23", to: "ABC1D24" },
          category: { from: "SUV", to: "PICKUP" },
          notes: { from: "a", to: "b" },
        },
      }),
    ).toBe(
      "Alterou quilometragem (0 km → 1.000 km), placa (ABC-1D23 → ABC-1D24), categoria, observações",
    );
  });

  it("descreve o ciclo da senha provisória", () => {
    expect(describeAudit("PASSWORD_RESET_REQUESTED", { channel: "central" })).toBe(
      "Pedido feito à central",
    );
    expect(describeAudit("PASSWORD_TEMPORARY_SET", { requested: true })).toBe("A pedido da pessoa");
    expect(describeAudit("PASSWORD_RESET_COMPLETED", { via: "temporary" })).toBe(
      "Trocou a senha provisória",
    );
    expect(describeAudit("PASSWORD_RESET_COMPLETED", { via: "self" })).toBe(
      "Trocou a própria senha pelo perfil",
    );
  });

  it("tolera metadados ausentes ou estranhos", () => {
    expect(describeAudit("LOGIN", null)).toBe("");
    expect(describeAudit("REQUEST_REJECTED", ["x"])).toBe("");
  });
});
