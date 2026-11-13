"""Gera os fluxogramas da cautela como SVG independentes (cores fixas, fonte Inter)."""
import sys

C = {
    "gray":   ("#F1EFE8", "#5F5E5A", "#444441", "#5F5E5A"),
    "teal":   ("#E1F5EE", "#0F6E56", "#085041", "#0F6E56"),
    "red":    ("#FCEBEB", "#A32D2D", "#791F1F", "#A32D2D"),
    "amber":  ("#FAEEDA", "#854F0B", "#633806", "#854F0B"),
    "purple": ("#EEEDFE", "#534AB7", "#3C3489", "#534AB7"),
}
ARROW = "#5F5E5A"

def head(w, h, title, desc):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" font-family="Inter, 'DejaVu Sans', sans-serif">
<title>{title}</title><desc>{desc}</desc>
<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="{ARROW}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>
<rect width="{w}" height="{h}" fill="#FFFFFF"/>
'''

def node(x, y, w, color, title, sub, h=56):
    fill, stroke, tc, sc = C[color]
    cx = x + w / 2
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}" stroke="{stroke}" stroke-width="1"/>'
            f'<text x="{cx}" y="{y+19}" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="600" fill="{tc}">{title}</text>'
            f'<text x="{cx}" y="{y+38}" text-anchor="middle" dominant-baseline="central" font-size="12" fill="{sc}">{sub}</text>\n')

def line(x1, y1, x2, y2):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{ARROW}" stroke-width="1.2" marker-end="url(#arrow)"/>\n'

def path(d, arrow=True, dashed=False):
    extra = ' marker-end="url(#arrow)"' if arrow else ''
    dash = ' stroke-dasharray="4 4"' if dashed else ''
    return f'<path d="{d}" fill="none" stroke="{ARROW}" stroke-width="1.2"{dash}{extra}/>\n'

MAIN = [
    ("Solicitação", "Pendente de análise"),
    ("Aguardando retirada", "Aprovada, carro reservado"),
    ("Retirada em andamento", "Checklist de retirada aberto"),
    ("Em uso", "Retirada enviada"),
    ("Devolução em análise", "Devolução enviada"),
]

def original():
    out = [head(680, 540, "Fluxo da solicitação e da cautela",
                "Caminho principal da solicitação até a cautela finalizada, com recusa, cancelamento e atraso.")]
    x, w = 210, 240
    for i, (t, s) in enumerate(MAIN):
        out.append(node(x, 30 + 86 * i, w, "gray", t, s))
    out.append(node(x, 460, w, "teal", "Finalizada", "Admin aprova, carro livre"))
    for i in range(5):
        y = 30 + 86 * i
        out.append(line(330, y + 58, 330, y + 82))
    out.append(node(480, 30, 170, "red", "Encerrada", "Recusada ou cancelada"))
    out.append(line(452, 58, 476, 58))
    out.append(node(480, 288, 170, "red", "Atrasada", "Prazo vencido"))
    out.append(line(452, 316, 476, 316))
    out.append(path("M208 144 L190 144 L190 402 L208 402", arrow=False, dashed=True))
    out.append(node(20, 245, 150, "red", "Cancelada", "Admin, fase ativa"))
    out.append(line(190, 273, 174, 273))
    out.append("</svg>\n")
    return "".join(out)

def atualizado():
    W, H = 800, 600
    out = [head(W, H, "Fluxo da solicitação e da cautela (com correções)",
                "Fluxo após as correções: atraso ainda permite devolver e a retificação volta ao servidor.")]
    x, w = 300, 240
    cx = x + w / 2
    for i, (t, s) in enumerate(MAIN):
        out.append(node(x, 30 + 86 * i, w, "gray", t, s))
    out.append(node(x, 460, w, "teal", "Finalizada", "Com ou sem observação"))
    for i in range(5):
        y = 30 + 86 * i
        out.append(line(cx, y + 58, cx, y + 82))
    # Saídas à direita
    out.append(node(580, 30, 180, "red", "Encerrada", "Recusada ou cancelada"))
    out.append(line(542, 58, 576, 58))
    out.append(node(580, 288, 180, "amber", "Atrasada", "Devolução segue liberada"))
    out.append(line(542, 316, 576, 316))
    out.append(path("M670 346 L670 360 L520 360 L520 371"))
    out.append(node(580, 374, 180, "purple", "Retificação", "Servidor corrige e reenvia"))
    out.append(line(542, 394, 576, 394))
    out.append(line(578, 414, 544, 414))
    # Cancelamento à esquerda
    out.append(path("M298 144 L280 144 L280 402 L298 402", arrow=False, dashed=True))
    out.append(node(60, 245, 180, "red", "Cancelada", "Pelo admin, fase ativa"))
    out.append(line(280, 273, 244, 273))
    # Legenda
    ly = 548
    items = [("gray", "Etapas do fluxo"), ("teal", "Encerramento normal"), ("amber", "Atenção"),
             ("purple", "Volta ao servidor"), ("red", "Saída do fluxo")]
    lx = 60
    for color, label in items:
        fill, stroke, _, sc = C[color]
        out.append(f'<rect x="{lx}" y="{ly}" width="14" height="14" rx="3" fill="{fill}" stroke="{stroke}"/>'
                   f'<text x="{lx+20}" y="{ly+7}" dominant-baseline="central" font-size="12" fill="#444441">{label}</text>\n')
        lx += 20 + len(label) * 7 + 26
    out.append("</svg>\n")
    return "".join(out)

if __name__ == "__main__":
    d = sys.argv[1]
    open(f"{d}/fluxo-cautela-original.svg", "w", encoding="utf-8").write(original())
    open(f"{d}/fluxo-cautela.svg", "w", encoding="utf-8").write(atualizado())
    print("ok")

C["blue"] = ("#E6F1FB", "#185FA5", "#0C447C", "#185FA5")

def small(x, y, w, color, label, h=34):
    fill, stroke, tc, _ = C[color]
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{fill}" stroke="{stroke}" stroke-width="1"/>'
            f'<text x="{x+12}" y="{y+h/2}" dominant-baseline="central" font-size="12.5" fill="{tc}">{label}</text>\n')

def plain(x1, y1, x2, y2):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{ARROW}" stroke-width="1"/>\n'

def organograma():
    cols = [
        ("teal", "Área do servidor", "Perfil Usuário", [
            "Início (painel pessoal)", "Solicitar veículo", "Minhas solicitações",
            "Minhas cautelas", "Checklist de retirada", "Checklist de devolução", "Notificações"]),
        ("purple", "Área administrativa", "Admin e Super admin", [
            "Painel de indicadores", "Calendário da frota", "Solicitações (análise)", "Cautelas",
            "Conferência de checklists", "Veículos", "Avarias", "Usuários", "Relatórios (CSV)"]),
        ("gray", "Serviços automáticos", "Sem tela própria", [
            "Rotina diária (atraso e lembretes)", "E-mails do sistema", "Auditoria de ações",
            "Fotos (Supabase Storage)", "Controle de acesso e sessões"]),
    ]
    W, colw, gap = 900, 270, 25
    x0 = (W - (3 * colw + 2 * gap)) / 2
    leaf_h, leaf_gap = 34, 10
    top_y, l2_y, leaf_y0 = 24, 140, 230
    maxleaves = max(len(c[3]) for c in cols)
    H = leaf_y0 + maxleaves * (leaf_h + leaf_gap) + 20
    out = [head(W, H, "Mapa do sistema", "Organização do sistema em área do servidor, área administrativa e serviços automáticos.")]
    out.append(node(W / 2 - 170, top_y, 340, "blue", "Sistema de Cautela de Veículos", "SEPLAG / SATGF"))
    bus_y = 110
    out.append(plain(W / 2, top_y + 56, W / 2, bus_y))
    centers = [x0 + i * (colw + gap) + colw / 2 for i in range(3)]
    out.append(plain(centers[0], bus_y, centers[-1], bus_y))
    for i, (color, title, sub, leaves) in enumerate(cols):
        cx = centers[i]
        x = cx - colw / 2
        out.append(line(cx, bus_y, cx, l2_y - 3))
        out.append(node(x, l2_y, colw, color, title, sub))
        spine_x = x + 18
        last_mid = leaf_y0 + (len(leaves) - 1) * (leaf_h + leaf_gap) + leaf_h / 2
        out.append(plain(spine_x, l2_y + 56, spine_x, last_mid))
        for j, leaf in enumerate(leaves):
            ly = leaf_y0 + j * (leaf_h + leaf_gap)
            out.append(plain(spine_x, ly + leaf_h / 2, x + 36, ly + leaf_h / 2))
            out.append(small(x + 36, ly, colw - 36, color, leaf))
    out.append("</svg>\n")
    return "".join(out)

def arquitetura():
    W, H = 900, 330
    out = [head(W, H, "Infraestrutura", "Usuários acessam o sistema na Vercel, que usa banco e fotos no Supabase; o código vem do GitHub.")]
    out.append(node(30, 60, 200, "gray", "Usuários", "Navegador ou celular"))
    out.append(node(330, 40, 240, "blue", "Vercel", "Aplicação Next.js"))
    out.append(small(330, 110, 240, "blue", "Servidor em São Paulo (gru1)"))
    out.append(small(330, 152, 240, "blue", "Rotina diária às 05:00 (Cuiabá)"))
    out.append(node(670, 40, 200, "teal", "Supabase", "Banco PostgreSQL"))
    out.append(small(670, 110, 200, "teal", "Storage: fotos (privado)"))
    out.append(node(330, 240, 240, "gray", "GitHub", "Código e histórico"))
    out.append(node(670, 240, 200, "amber", "E-mail (SMTP)", "A configurar"))
    out.append(line(232, 88, 326, 88))
    out.append(line(572, 68, 666, 68))
    out.append(line(450, 238, 450, 190))
    out.append(path("M572 166 L620 166 L620 268 L666 268"))
    out.append(f'<text x="279" y="78" text-anchor="middle" font-size="11" fill="#5F5E5A">HTTPS</text>')
    out.append(f'<text x="619" y="58" text-anchor="middle" font-size="11" fill="#5F5E5A">dados</text>')
    out.append(f'<text x="462" y="216" font-size="11" fill="#5F5E5A">publicação automática</text>')
    out.append("</svg>\n")
    return "".join(out)

if __name__ == "__main__":
    d = sys.argv[1]
    open(f"{d}/mapa-do-sistema.svg", "w", encoding="utf-8").write(organograma())
    open(f"{d}/infraestrutura.svg", "w", encoding="utf-8").write(arquitetura())
    print("ok2")
