# Central de Veículos Compartilhados · Registro de decisões

O sistema deixou de ser uma cautela (o servidor retira o carro e dirige) e passou a funcionar como uma central: os órgãos pedem o transporte e a SATGF aloca veículo e condutor. Atualizado em 2026-11-14.

## Fluxo

1. O servidor do órgão abre uma **solicitação de transporte**: data e horário de saída, retorno previsto, local de saída, destino, número de passageiros (e nomes, se souber), finalidade e telefone de contato no dia.
2. A central analisa e **aprova ou recusa**.
3. Na aprovação, a central escolhe o **veículo** e o **condutor**. O sistema bloqueia veículo ou condutor já ocupados no período e condutor com CNH vencida antes do fim da viagem.
4. O condutor é **avisado** (notificação na plataforma e e-mail) com trajeto, horário, veículo, passageiros e contato do solicitante. O solicitante recebe a confirmação com veículo e condutor.
5. O condutor preenche o **checklist de saída** ao pegar o carro e o **checklist de retorno** ao devolver (km, combustível, fotos, avarias). Os lembretes e o alerta de atraso vão para ele.
6. A central confere o checklist de retorno e a viagem é **encerrada**, com histórico por órgão, veículo e condutor.

## Decisões

| # | Decisão | Motivo |
|---|---|---|
| 1 | **Nomes internos mantidos** (`Caution`, `/cautelas`, código `CTL-`) e só a interface fala em "viagem" | Renomear tabelas e rotas exigiria migração destrutiva e quebraria links e e-mails já enviados. A mudança é de regra, não de nome. |
| 2 | **`Caution.driverId` opcional** | Cautelas antigas não têm condutor; nelas o próprio solicitante continua responsável pelos checklists. Toda viagem nova exige condutor na aprovação. |
| 3 | **Condutor é um perfil, não um papel** (`User.isDriver` + categoria e validade da CNH) | Um gestor da central (ADMIN) também pode dirigir, e o RBAC por hierarquia (USER < ADMIN < SUPER_ADMIN) continua intacto. Qualquer ADMIN habilita condutores na tela do usuário. |
| 4 | **Responsável pela viagem = condutor** (`responsibleUserId`) | Checklists, fotos, lembretes, alerta de atraso e aviso de avaria vão para quem está com o carro. Solicitante e condutor podem consultar a viagem; só o responsável preenche. |
| 5 | **Órgão como catálogo** (`Agency`) com o nome gravado em texto no usuário e na solicitação | Mesmo padrão dos outros catálogos: o histórico não muda se o órgão for desativado. Permite o relatório de viagens por órgão. |
| 6 | **Órgão vem do cadastro**, não do formulário | Segue a regra de puxar os dados funcionais da conta. Contas antigas sem órgão escolhem uma vez no primeiro pedido e o valor passa a valer para a conta. Com o catálogo vazio, nada é exigido. |
| 7 | **Turno deduzido do horário** (`deriveShift`) | O formulário ficou mais curto, e calendário e relatórios que usam o turno continuam funcionando. |
| 8 | **Vários domínios de e-mail** em `ALLOWED_EMAIL_DOMAIN` (lista separada por vírgula, com curinga `*.mt.gov.br`) | Servidores de outros órgãos precisam se cadastrar. O curinga exige subdomínio real, então `x.mt.gov.br.fake.com` e `evilmt.gov.br` continuam barrados. O padrão segue `seplag.mt.gov.br`. |
| 9 | **Migração só aditiva** | Colunas novas são opcionais ou têm valor padrão. O código atual (main) continua funcionando com o banco já migrado. |

## O que mudou para cada perfil

- **Solicitante**: menu "Solicitar transporte" e "Minhas solicitações". Vê veículo, condutor e telefone do condutor quando o pedido é aprovado.
- **Condutor**: menu "Minhas viagens" e bloco "Como condutor" no início, com as próximas saídas.
- **Central (admin)**: aprovação com escolha de condutor; telas novas **Condutores** (CNH, viagens em aberto, próxima saída) e **Órgãos**; viagens, calendário e relatórios mostram órgão e condutor; relatórios novos de viagens por órgão e por condutor.

## Como aplicar

```bash
npm run prisma:deploy   # aplica 20261114040000_central_veiculos_compartilhados
npm run db:seed         # opcional: cadastra o órgão SEPLAG no catálogo
```

Depois, na área da central: cadastre os órgãos atendidos em **Órgãos**, habilite os condutores em **Usuários** (marcando "Condutor da central") e, se outros órgãos forem usar, ajuste `ALLOWED_EMAIL_DOMAIN` (ex.: `seplag.mt.gov.br,*.mt.gov.br`).

## Pontos em aberto (confirmar com a SATGF)

- **Condutores terceirizados** sem e-mail institucional não conseguem se cadastrar hoje. Se for o caso, falta um cadastro de condutor feito pela própria central.
- **Aprovação da chefia do órgão** antes de chegar na central: não existe; hoje o pedido vai direto para a central.
- **Rateio ou prestação de contas por órgão**: o relatório já conta viagens por órgão; quilometragem e custo por órgão ainda não.
- **Viagem sem condutor** (servidor dirigindo, como na cautela antiga) não é mais aberta pela tela de aprovação.
