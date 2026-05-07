# MasterBot

Painel interno usado pela Master Vacation Homes pra gerenciar templates de mensagem do Airbnb, criar jobs do dia (BBQ / Pool Heat / Deliver-Pickup) e adicionar a nota correspondente no MAPRO — tudo numa aba só, usando a própria sessão Brave/Chrome do agent.

No ar em <https://alissonrochah.github.io/>.

## Como as peças se encaixam

```
┌────────────────┐    ┌──────────────────────┐    ┌────────────────────┐
│  Páginas       │ →  │  MasterBot Bridge    │ →  │  Jobber + MAPRO    │
│  GitHub Pages  │    │  Extensão do browser │    │  (sessão do user)  │
└────────────────┘    └──────────────────────┘    └────────────────────┘
       │                                                     ↑
       └──────── api-proxy (Vercel) ─── admin MAPRO ─────────┘
                       (só leitura: lista de unidades, stays)
```

Três camadas de código vivem nesse repo:

| Camada | O que faz | Onde |
|---|---|---|
| **Páginas** | Login, templates de mensagens, dashboard de unidades, settings | `*.html`, `style/`, `js/` |
| **Extensão** | Faz a ponte entre as páginas e a sessão Jobber/MAPRO já logada do user pra ações de escrita (criar job, postar nota, adicionar service) | `extension/` |
| **API proxy** | Funções Vercel só de leitura que puxam dados compartilhados do MAPRO (catálogo de unidades, stays por reserva) usando um cookie admin único | `api-proxy/` |

## O que esse app NÃO faz

Essa seção existe pra qualquer pessoa — técnica ou não — auditar o caminho dos dados sozinha e ver que o app **não exfiltra nem armazena dados da empresa**. Cada afirmação abaixo é verificável no código em `extension/` e `api-proxy/`.

**O app é um atalho de interface, não um pipeline de dados.** Cada detalhe de reserva, nome de hóspede, gate code ou número de job que aparece na tela é puxado ao vivo do MAPRO ou do Jobber — os mesmos sistemas que o time já paga pra usar. Nada é raspado, espelhado ou arquivado em outro lugar.

**Nenhum usuário faz login no MAPRO, Jobber ou Airbnb por meio do app.** A extensão não pede e não vê sua senha do MAPRO/Jobber/Airbnb. Ela usa a sessão que o browser já tem aberta — exatamente os mesmos cookies que sua aba normal usa. Se você não pode fazer algo manualmente no MAPRO, também não consegue pelo app.

**O app não consegue fazer nada que você não pudesse fazer em 5 cliques manuais.** "Criar um job", "postar um comentário", "adicionar um service" — são as mesmas ações que um manager já faz no Jobber/MAPRO na mão. O app só encadeia pra você clicar uma vez em vez de quinze. Não tem backdoor privilegiada, não tem service account, não tem acesso escondido.

### O que é armazenado, e onde

| Onde | O quê | De quem é |
|---|---|---|
| **Cookies da sua sessão no browser** | `SID` do MAPRO, sessão do Jobber, auth do Airbnb | Você / a empresa (igualzinho a abrir MAPRO numa aba nova) |
| **Firebase / Firestore** (`templates/`, `settings/`) | Templates de mensagem que o time escreve à mão + configurações de UI por usuário (assinatura, saudação, categorias, favoritos) | Banco pessoal do Alisson (dev). **Não contém nenhum dado puxado do MAPRO, Jobber ou Airbnb** — só o que os próprios atendentes digitam quando criam um template. |
| **localStorage do browser** | Preferência de tema (dark/light), pequenos caches (lista de unidades, nome do member) — só pra deixar a página mais rápida, nunca enviado pra lugar nenhum | Apenas seu browser local |
| **Upstash KV** (usado pelo api-proxy) | Um único cookie `SID` admin do MAPRO, atualizado manualmente quando expira | O mesmo admin MAPRO da empresa que loga no MAPRO todo dia |

Esta é a lista **completa** de tudo que fica armazenado em algum lugar. Não tem banco de dados separado registrando quem viu qual reserva, não tem analytics em cima de dados de hóspedes, não tem rastreador terceirizado. Dados de booking/hóspede/listing passam só pela memória — buscados do MAPRO quando a página renderiza, descartados depois.

Sobre o Firebase em particular: o projeto é pessoal (do dev) e contém **somente** o que o time decide salvar nele — os templates que os atendentes mesmos escrevem (ex: "Hi {name}, your gate code is..."), e umas preferências de UI por user. Nenhuma reserva, hóspede, listing, gate code real ou qualquer dado de operação cai lá. O Firebase aqui é, na prática, um caderno compartilhado de mensagens prontas — não um espelho do MAPRO.

### O que sai "da máquina"

| Destino | O que vai pra lá | Por quê |
|---|---|---|
| `secure.getjobber.com` | Queries GraphQL do Jobber (buscar property, criar job) — enviadas **do seu browser** com **seus** cookies | Esse é o Jobber, o mesmo site que sua aba abre |
| `app.mapro.us` | Ações de booking no MAPRO (postar nota, adicionar service) — enviadas **do seu browser** com **seus** cookies | Esse é o MAPRO, idem |
| `firebaseapp.com` / Firestore | Leituras/escritas dos templates de mensagem que o time escreveu à mão e das suas preferências de UI (assinatura, categorias, etc.). Ligados ao seu UID. | Onde os templates ficam guardados. Nada que trafega aqui veio do MAPRO/Jobber/Airbnb. |
| `<vercel-url>/api/mapro/*` | Requests só de leitura pra catálogo de unidades / stays / endereços, assinadas com seu token Firebase | Um transporte fininho que segura o cookie do admin MAPRO pra cada agent não precisar do próprio login admin. O proxy não guarda nada da request. |

Nada é enviado pra nenhum servidor fora dessa lista.

### Como verificar

- Abre DevTools → aba Network enquanto usa o app. Toda request vai pra um dos quatro destinos acima. Não tem mais nada.
- Lê `extension/background.js` — é a lógica completa da extensão, ~400 linhas. As únicas chamadas `fetch()` vão pra `secure.getjobber.com` (Jobber) e `app.mapro.us` (MAPRO). Nenhum outro host.
- Lê `api-proxy/api/_lib/mapro.js` — o proxy busca algumas páginas HTML do MAPRO e faz parsing. Não escreve nada de volta no MAPRO, exceto quando uma ação real do user dispara uma escrita (e essa escrita acontece a partir do browser do user, não do proxy).
- O código todo tá nesse repo. Qualquer um com acesso de leitura pode auditar qualquer linha.

## Páginas

| Página | O que faz |
|---|---|
| `index.html` | Login Firebase com email + senha |
| `messages.html` | Escolhe um template salvo e copia pro Airbnb |
| `template.html` | CRUD desses templates (categorias, drag-to-reorder, import/export) |
| `units.html` | A agenda do dia: mostra as stays de cada unidade, deixa criar jobs (BBQ / Pool Heat / Deliver-Pickup) no Jobber, e auto-vincula com a reserva certa do MAPRO já adicionando o service |
| `settings.html` | Configuração de assinatura/saudação por user, mais gerenciamento de users (admin only) |

Auth é Firebase (projeto pessoal do dev — ver a seção [O que esse app NÃO faz](#o-que-esse-app-nÃo-faz) pra detalhe sobre o que vai e o que não vai pra lá). Config por usuário (assinaturas, categorias, favoritos) fica no Firestore em `settings/{uid}`, e os templates que o time escreve ficam em `templates/{uid}/userTemplates/{name}`. Dados administrativos (criar usuários) checam o flag `isAdmin` no mesmo doc.

Código compartilhado de front-end em `js/`:

- `js/firebase.js` — fonte única de verdade pra config do Firebase + exports `app`/`auth`/`db`
- `js/toast.js` — helper `showToast(message, type)`
- `js/nav.js` — header com logo + menu + Sign Out, renderizado pelas páginas
- `js/theme.js` — aplica o tema (dark/light) salvo antes do paint pra evitar o flash

## Extensão — MasterBot Bridge

`extension/` é uma extensão Manifest V3 que executa as sessões Jobber e MAPRO do próprio user em nome da página de units. Funciona só como transporte — nada fica armazenado.

O que ela expõe via `chrome.runtime.onMessageExternal`:

- `jobber-query` — roda uma query GraphQL contra `secure.getjobber.com`
- `mapro-add-comment` — posta uma nota em uma reserva no MAPRO
- `mapro-add-service` — abre a página da reserva numa aba em background e dirige a UI nativa do MAPRO (chama `add_service`, seleciona o service certo no dropdown, preenche datas se necessário, clica Save). Detecta sucesso hookeando `XMLHttpRequest` e observando a resposta JSON de `/ajax?booking-reservar`.
- `mapro-list-services` — mesmo tipo de probe via aba background, retorna a lista de services que já existem na reserva (usado pelo aviso de BBQ duplicado)

A página host (`units.html`) só conhece o ID da extensão — todo o fluxo MAPRO/Jobber é opaco pra ela.

Pra instalar pra dev: `chrome://extensions` → modo desenvolvedor → "Load unpacked" → escolhe `extension/`.

Um build zipado (`extension.zip`) é regenerado automaticamente por `.github/workflows/build-extension-zip.yml` em todo push que toca em `extension/`.

## API proxy

`api-proxy/` é um deploy minúsculo no Vercel com alguns endpoints sob `/api/mapro/*`:

- `units` — lista completa das unidades (catálogo)
- `unit-stays?key={ulid}&date={YYYY-MM-DD}` — stays Anterior/Atual/Próxima ao redor de uma data
- `unit-address?id={mapro_id}` — endereço completo

Tudo só de leitura — qualquer coisa que *escreve* no MAPRO passa pela extensão usando a sessão do próprio user. Esses 3 endpoints usam um único cookie admin do MAPRO guardado no Upstash KV.

Endpoint admin:

- `POST /api/admin/mapro-cookie` — sobe um `SID` cookie novo do MAPRO quando o anterior expira. Exige um token Firebase de um user com `isAdmin: true`. Não tem UI; você manda via `curl` na mão.

## Referência das APIs

Três conjuntos de tráfego HTTP saem do app: GraphQL do Jobber (escrita, sessão do user), MAPRO direto (escrita, também sessão do user) e MAPRO via api-proxy (só leitura, sessão do admin). Toda chamada Jobber/MAPRO é *autenticada por cookies que o browser do user já tem* — nenhum API token é guardado em lugar nenhum.

### Jobber — GraphQL

Atingido pela action `jobber-query` da extensão.

- **Endpoint:** `POST https://secure.getjobber.com/api/graphql?location=j`
- **Auth:** cookies do browser (extensão usa `credentials: "include"`; o user precisa estar logado no Jobber no mesmo browser)
- **Headers obrigatórios:** `X-Jobber-Graphql-Version: 2026-04-16`, `X-Requested-With: XMLHttpRequest`

Operations que o front usa hoje:

| Operation | Tipo | Pra que serve | Variables |
|---|---|---|---|
| `JobberCurrentAccount` | query | Pega o nome do agent logado (pra carimbar no custom field "Member") | — |
| `GlobalSearch` | query | Busca Property/Client por termo (usado pra vincular uma unidade do MAPRO ao seu property no Jobber) | `{ searchTerm, first }` |
| `JobDefaultCustomFieldValues` | query | Lê as opções do dropdown `Member` pro client/property escolhido | `{ clientId?, propertyId? }` |
| `MasterBotPropertyJobs` | query | Lista jobs existentes pra um property (usado pra avisar se há conflito de PH antes de criar novos) | `{ clientId, propertyIds, first }` |
| `CreateJob` | mutation | Cria um job no Jobber | `{ input: JobCreateAttributes }` |

Formato da resposta: GraphQL padrão — `{ data: {...}, errors?: [...] }`. O `userErrors` aninhado dentro de `jobCreate` é outro tipo de erro (validação) e o front mostra essas mensagens ao user.

### MAPRO — direto (extensão, sessão do user)

Tudo isso anda em cima da sessão que o agent tem aberta no mesmo browser (cookies enviados automaticamente; o `host_permissions` da extensão lista `https://app.mapro.us/*`).

| Endpoint | Método | Usado por | Notas |
|---|---|---|---|
| `/booking/reservation/{id}` | GET (carregar página) | `mapro-add-service`, `mapro-list-services` | A extensão abre essa página em uma aba background e dirige o form via `chrome.scripting.executeScript` no MAIN world (chama o `add_service()` global da própria página, preenche inputs de data, dispara um MouseEvent nativo no Save). |
| `/ajax?manage-booking-details-commented` | POST (form-data) | `mapro-add-comment` | Body: `tx-comentario`, `reserva_id`, `casa_id`, `comentario`. Retorna `{status: true, ...}` no sucesso. |
| `/ajax?booking-reservar` | POST (form-data) | indiretamente, via o click no Save durante `mapro-add-service` | Retorna `{status: true}` quando salva. A extensão hookeia `XMLHttpRequest.prototype.open` antes do click pra ler o JSON da resposta e decidir success/error. |

### MAPRO — via api-proxy (Vercel, sessão do admin)

Usado só pra dados *somente-leitura* que são iguais pra todo agent (catálogo de unidades, calendar de stays, endereços). Caller: `units.html`. O proxy mantém um único `SID` admin do MAPRO no Upstash KV.

O front chama o proxy mandando um Firebase ID token no header `Authorization: Bearer ...` — o proxy verifica via Firebase Admin e só então repassa pro MAPRO usando o cookie guardado.

| Chamada do front | O que retorna | Requests subjacentes ao MAPRO |
|---|---|---|
| `GET /api/mapro/units` | array de unidades (`{idMAPRO, ulid, code, title, …, bbq, poolHeater}`) | `GET /manage/houses/list` (HTML do catálogo) + `GET /manage/houses/resort/list` (lookup de resorts) + 3× `GET /settings/services/register/{id}` (quais properties têm BBQ/PH35/PH75) |
| `GET /api/mapro/unit-stays?key={ulid}&date={YYYY-MM-DD}` | `{previous, active, next}` — cada um é um stay ou `null` | `GET /calendar/reservation?start=…&properties=…&single_property=1` |
| `GET /api/mapro/unit-address?id={mapro_id}` | `{street, city, state, zip}` | `GET /manage/houses/register/{id}` |
| `POST /api/admin/mapro-cookie` (admin only) | `{ok: true}` | — (escreve o `SID` novo no Upstash KV) |

Se o `SID` armazenado tiver morrido, o proxy responde `503` com `error: "MAPRO_NOT_LOGGED_IN"`. Atualiza o cookie via o endpoint admin:

```sh
curl -X POST https://<vercel-url>/api/admin/mapro-cookie \
     -H "Authorization: Bearer <firebase-id-token>" \
     -H "Content-Type: application/json" \
     -d '{"cookie":"<novo-valor-de-SID>"}'
```

### Extensão — API de mensageria (página → extensão)

A página chama a extensão via `chrome.runtime.sendMessage(EXT_ID, {action, payload}, callback)`. Origens permitidas estão em `externally_connectable` no manifest (atualmente `https://alissonrochah.github.io/*` e `http://localhost:*/*`). Toda resposta é `{ok: true, data}` ou `{ok: false, error}`.

| `action` | `payload` | `data` no sucesso |
|---|---|---|
| `ping` | `{}` | `{version: "0.6.0"}` |
| `jobber-query` | `{operationName, query, variables}` | o objeto `data` do GraphQL |
| `mapro-add-comment` | `{reservaId, casaId, comment}` | a resposta JSON do MAPRO |
| `mapro-add-service` | `{reservaId, kind: "bbq" \| "ph", price, startDate, endDate, dryRun?, force?, checkOnly?}` | `{serviceId, serviceLabel, status: "saved" \| "duplicate" \| "dry-run", existingLabel?, existingDate?, dateDebug?}` |
| `mapro-list-services` | `{reservaId}` | `{services: [{label, value, start_date, end_date}, …]}` |

Flags do `mapro-add-service`:
- `dryRun: true` — adiciona o service block no MAPRO e seleciona a opção certa, mas não clica Save (nada persiste).
- `checkOnly: true` — só checa se já existe um duplicado (retorna `{status: "duplicate"}` ou `{status: "not-duplicate"}`); não adiciona nada.
- `force: true` — bypassa a checagem "já existe BBQ pra essa data".

## Desenvolvimento local

1. **Páginas** — não tem build step. Abre `index.html` no browser, ou roda `python3 -m http.server` da raiz do repo e visita `http://localhost:8000/`.
2. **Extensão** — carrega `extension/` unpacked no browser; recarrega em `chrome://extensions` depois de editar.
3. **API proxy** — `cd api-proxy && npx vercel dev` pra rodar local.

## Branches

- `main` — produção. GitHub Pages serve a partir daqui.
- `chore/polish` — passe atual de cleanup/refatoração. Vai pra main quando estiver pronto.
- `feature/mapro-integration` — preservada pra referência. Direção mais antiga que tinha uma extensão "Resort Info" injetando botões de gate-code/property-manager/extras direto na UI do Airbnb. Não está ativa, mas vale roubar dela se quisermos esse fluxo um dia.
