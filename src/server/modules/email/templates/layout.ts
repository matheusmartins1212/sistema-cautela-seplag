/**
 * Layout institucional base para e-mails (cabeçalho azul escuro, card central),
 * compatível com Gmail/Outlook (CSS inline, tabelas). Sem dependências externas.
 */
const BRAND = "Sistema de Cautela de Veículos";
const SUBBRAND = "SEPLAG / SATGF";

export interface LayoutParts {
  heading: string;
  // Parágrafos do corpo (HTML simples já escapado pelo chamador).
  paragraphs: string[];
  action?: { label: string; url: string };
  footerNote?: string;
}

export function renderHtml(parts: LayoutParts): string {
  const body = parts.paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1f2937;">${p}</p>`)
    .join("");

  const action = parts.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
         <tr><td style="border-radius:6px;background:#173d8f;">
           <a href="${parts.action.url}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${parts.action.label}</a>
         </td></tr>
       </table>`
    : "";

  const footerNote = parts.footerNote
    ? `<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#6b7280;">${parts.footerNote}</p>`
    : "";

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="background:#173d8f;padding:20px 28px;">
          <div style="font-size:12px;letter-spacing:.04em;color:#a7c5e9;">${SUBBRAND}</div>
          <div style="font-size:18px;font-weight:700;color:#ffffff;">${BRAND}</div>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#12337a;">${parts.heading}</h1>
          ${body}
          ${action}
          ${footerNote}
        </td></tr>
        <tr><td style="padding:18px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#6b7280;">Mensagem automática · não responda este e-mail.<br>Uso restrito e auditado — Secretaria de Estado de Planejamento e Gestão de Mato Grosso.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function renderText(parts: LayoutParts): string {
  const lines = [`${BRAND} — ${SUBBRAND}`, "", parts.heading, ""];
  lines.push(...parts.paragraphs);
  if (parts.action) {
    lines.push("", `${parts.action.label}: ${parts.action.url}`);
  }
  if (parts.footerNote) {
    lines.push("", parts.footerNote);
  }
  lines.push(
    "",
    "Mensagem automática · não responda este e-mail.",
    "Uso restrito e auditado — SEPLAG / SATGF.",
  );
  return lines.join("\n");
}
