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
  });

  it("tolera metadados ausentes ou estranhos", () => {
    expect(describeAudit("LOGIN", null)).toBe("");
    expect(describeAudit("REQUEST_REJECTED", ["x"])).toBe("");
  });
});
