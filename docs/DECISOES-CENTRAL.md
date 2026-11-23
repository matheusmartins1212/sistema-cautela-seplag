# Central de Veículos Compartilhados · Registro de decisões

O sistema atende os dois modelos lado a lado. No pedido, o servidor escolhe **com condutor da central** (a SATGF envia veículo e motorista) ou **eu mesmo dirijo** (cautela tradicional: ele retira, dirige e devolve). Atualizado em 2026-11-23.

## Fluxo

1. O servidor abre uma **solicitação** e escolhe a modalidade. Em qualquer uma informa saída, retorno previsto, destino, finalidade e telefone de contato no dia. Com condutor, informa também o local de saída e o número de passageiros (e os nomes, se souber).
2. A central analisa e **aprova ou recusa**.
3. Na aprovação, a central escolhe o **veículo** e, se o pedido foi com condutor, o **condutor** (obrigatório). Num pedido sem condutor a opção padrão é "o próprio solicitante dirige", mas a central pode escalar um condutor se preferir. O sistema bloqueia veículo ou condutor já ocupados no período e condutor com CNH vencida antes do fim da viagem.
4. O condutor é **avisado** (notificação na plataforma e e-mail) com trajeto, horário, veículo, passageiros e contato do solicitante. O solicitante recebe a confirmação com veículo e condutor.
5. Quem dirige (o condutor ou, sem condutor, o próprio solicitante) preenche o **checklist de saída** ao pegar o carro e o **checklist de retorno** ao devolver (km, combustível, fotos, avarias). Os lembretes e o alerta de atraso vão para essa pessoa.
6. A central confere o checklist de retorno e a viagem é **encerrada**, com histórico por órgão, veículo e condutor.

## Decisões

| #   | Decisão                                                                                                             | Motivo                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Nomes internos mantidos** (`Caution`, `/cautelas`, código `CTL-`) e só a interface fala em "viagem"               | Renomear tabelas e rotas exigiria migração destrutiva e quebraria links e e-mails já enviados. A mudança é de regra, não de nome.                                                                                                                                                                                           |
| 2   | **Modalidade no pedido** (`VehicleRequest.withDriver`) e **`Caution.driverId` opcional**                            | O mesmo fluxo serve aos dois modelos. Sem condutor, o solicitante é o responsável pelos checklists, como na cautela tradicional. Pedidos antigos ficam como "sem condutor".                                                                                                                                                 |
| 3   | **Condutor é um perfil, não um papel** (`User.isDriver` + categoria e validade da CNH), **só em contas de usuário** | O RBAC por hierarquia (USER < ADMIN < SUPER_ADMIN) continua intacto. Como o painel administrativo não acessa a área do servidor (onde ficam os checklists), administradores não são escalados: quem da central também dirige usa uma conta de usuário. Promover um condutor a administrador tira dele o perfil de condutor. |
| 4   | **Responsável pela viagem = condutor** (`responsibleUserId`)                                                        | Checklists, fotos, lembretes, alerta de atraso e aviso de avaria vão para quem está com o carro. Solicitante e condutor podem consultar a viagem; só o responsável preenche.                                                                                                                                                |
| 5   | **Órgão como catálogo** (`Agency`) com o nome gravado em texto no usuário e na solicitação                          | Mesmo padrão dos outros catálogos: o histórico não muda se o órgão for desativado. Permite o relatório de viagens por órgão.                                                                                                                                                                                                |
| 6   | **Órgão vem do cadastro**, não do formulário                                                                        | Segue a regra de puxar os dados funcionais da conta. Contas antigas sem órgão escolhem uma vez no primeiro pedido e o valor passa a valer para a conta. Com o catálogo vazio, nada é exigido.                                                                                                                               |
| 7   | **Turno deduzido do horário** (`deriveShift`)                                                                       | O formulário ficou mais curto, e calendário e relatórios que usam o turno continuam funcionando.                                                                                                                                                                                                                            |
| 8   | **Vários domínios de e-mail** em `ALLOWED_EMAIL_DOMAIN` (lista separada por vírgula, com curinga `*.mt.gov.br`)     | Servidores de outros órgãos precisam se cadastrar. O curinga exige subdomínio real, então `x.mt.gov.br.fake.com` e `evilmt.gov.br` continuam barrados. O padrão segue `seplag.mt.gov.br`.                                                                                                                                   |
| 9   | **Migração só aditiva**                                                                                             | Colunas novas são opcionais ou têm valor padrão. O código atual (main) continua funcionando com o banco já migrado.                                                                                                                                                                                                         |

## O que mudou para cada perfil

- **Solicitante**: "Solicitar veículo" (com ou sem condutor), "Minhas solicitações" e "Minhas viagens". Com condutor, vê veículo, condutor e telefone quando o pedido é aprovado; sem condutor, abre a viagem e preenche os checklists.
- **Condutor**: em "Minhas viagens" e no início aparecem as viagens em que foi escalado, com os checklists de saída e retorno.
- **Central (admin)**: aprovação com escolha de veículo e, quando for o caso, condutor; telas **Condutores** (CNH, viagens em aberto, próxima saída) e **Órgãos**; viagens, calendário e relatórios mostram órgão e condutor; relatórios de viagens por órgão e por condutor.

## Como aplicar

```bash
npm run prisma:deploy   # aplica 20261114040000_central_veiculos_compartilhados e 20261123180000_modalidade_com_ou_sem_condutor
npm run db:seed         # opcional: cadastra o órgão SEPLAG no catálogo
```

Depois, na área da central: cadastre os órgãos atendidos em **Órgãos**, habilite os condutores em **Usuários** (marcando "Condutor da central") e, se outros órgãos forem usar, ajuste `ALLOWED_EMAIL_DOMAIN` (ex.: `seplag.mt.gov.br,*.mt.gov.br`).

## Pontos em aberto (confirmar com a SATGF)

- **Condutores terceirizados** sem e-mail institucional não conseguem se cadastrar hoje. Se for o caso, falta um cadastro de condutor feito pela própria central.
- **Aprovação da chefia do órgão** antes de chegar na central: não existe; hoje o pedido vai direto para a central.
- **Rateio ou prestação de contas por órgão**: o relatório já conta viagens por órgão; quilometragem e custo por órgão ainda não.
