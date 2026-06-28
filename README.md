# Bolasso 2026

<p align="center">
  <img
    src="public/images/torcedores.webp"
    alt="Três torcedores brasileiros comemorando"
    width="680"
  />
</p>

Bolão entre amigos para acompanhar a Copa do Mundo de 2026, registrar
palpites, consultar a tabela, brincar com o polvo místico e disputar o topo do
ranking.

**Acesse:** <https://evermatos.github.io/bolasso_2026/>

## Principais Recursos

- Login simples com username e senha, sem dependência de e-mail.
- Palpites liberados até cinco minutos antes de cada jogo.
- Autosave dos palpites, com botão de confirmação manual.
- Ranking geral, ranking do mata-mata e ranking final da fase de grupos.
- Palpites de outros participantes visíveis somente após o prazo do jogo.
- Página da Copa com tabela dos grupos, jogos do grupo e chave do mata-mata.
- Tema claro/escuro, layout responsivo e avatares divertidos.
- Painel de admin para publicar resultados e placares de pênaltis no mata-mata.
- Polvo místico com sugestão por usuário e por jogo, usando odds quando disponíveis.

## Como Funciona

1. Crie sua conta com um username e uma senha.
2. Entre na aba **Jogos** e informe seus palpites.
3. Se o jogo for de mata-mata e você apostar em empate, escolha também quem se classifica.
4. Consulte a aba **Copa** para ver tabela, jogos do grupo e chave do mata-mata.
5. Acompanhe sua posição na aba **Ranking**.
6. Clique em um participante no ranking para ver os palpites já liberados.

Os horários das partidas são exibidos no fuso de Abu Dhabi (`Asia/Dubai`).

## Pontuação

| Acerto | Pontos |
| --- | ---: |
| Placar exato | **7** |
| Resultado e gols exatos de uma seleção | **5** |
| Vencedor ou empate | **3** |
| Gols exatos de apenas uma seleção | **1** |
| Nenhuma condição | **0** |

Vale sempre a maior categoria atingida. Exemplo: palpite `2 × 0` e resultado
`2 × 1` valem **5 pontos**.

### Bônus do Mata-Mata

Em jogos de mata-mata, se o participante apostar em empate e acertar quem se
classifica após os pênaltis, ganha **+2 pontos**.

Exemplo: jogo termina `1 × 1`, o palpite foi `2 × 2`, e o participante acertou
quem se classificou. A pontuação será **3 + 2 = 5 pontos**.

Se o participante não apostou em empate, não recebe o bônus de classificação,
mesmo que tenha escolhido o mesmo time que avançou.

## Critérios de Desempate

Em caso de empate nos pontos totais, o ranking usa:

1. Número de placares exatos.
2. Número de palpites que renderam 5 pontos.
3. Número de palpites que renderam 3 pontos.
4. Número de palpites que renderam 1 ponto.

Se todos os critérios forem iguais, os participantes dividem a mesma posição,
indicada por um asterisco.

## Rankings

- **Geral:** soma todos os pontos do Bolasso.
- **Mata-mata:** conta apenas jogos a partir dos 16 avos de final.
- **Fase de grupos:** ranking fechado da fase de grupos, com pódio para os três primeiros.

As setas ao lado da posição indicam movimentação desde a última atualização de
resultado publicada pelo admin.

## Admin

Somente administradores podem publicar ou corrigir resultados. Ao publicar um
resultado, o sistema recalcula automaticamente:

- pontos dos palpites daquele jogo;
- ranking geral;
- ranking do mata-mata, quando aplicável;
- classificação e chave do mata-mata;
- movimentação de posições no ranking.

No mata-mata, se o jogo terminar empatado, o admin deve informar também o placar
dos pênaltis para definir quem se classificou.

## Polvo Místico

O polvo dá uma sugestão fixa por usuário e por jogo. Depois que um usuário
consulta o polvo para uma partida, a resposta daquele jogo não muda mais para
aquele usuário.

Quando há odds cadastradas no banco:

- 50% de chance de sugerir o favorito pelas odds;
- 25% para cada uma das outras duas opções.

Sem odds disponíveis, a escolha usa uma distribuição determinística entre
vitória do time da casa, empate e vitória do visitante.

## Odds

As odds ficam em `public.match_odds` e devem ser sincronizadas por script
administrativo, usando chaves secretas apenas no ambiente local/servidor.

1. Rode `supabase/migrations/20260623_match_odds.sql` no SQL Editor.
2. Adicione `SUPABASE_SERVICE_ROLE_KEY` e `THE_ODDS_API_KEY` no `.env.local`.
3. Confira os esportes disponíveis com `npm run odds:list-sports`.
4. Teste o casamento dos jogos com `npm run odds:sync:dry`.
5. Grave as odds no banco com `npm run odds:sync`.

O script usa `ODDS_SPORT_KEY=soccer_fifa_world_cup` por padrão. Se a API ainda
não disponibilizar odds da Copa, use `npm run odds:list-sports` para descobrir
qual chave está ativa.

Para atualizar o polvo nos jogos futuros, sincronize as odds e limpe as
previsões antigas somente dos jogos que ainda não começaram, quando fizer
sentido operacionalmente.

## Desenvolvimento

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
```

Outros comandos úteis:

```bash
npm run lint
npm run test
npm run preview
npm run odds:sync:dry
```

## Configuração

Crie um `.env.local` baseado no `.env.example`:

```bash
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE_PUBLICA

SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
THE_ODDS_API_KEY=sua_the_odds_api_key
ODDS_SPORT_KEY=soccer_fifa_world_cup
ODDS_REGIONS=eu
ODDS_MATCH_WINDOW_HOURS=48
```

As variáveis `VITE_*` são usadas pelo frontend. A `SUPABASE_SERVICE_ROLE_KEY`
deve ficar apenas em ambiente local/servidor e nunca deve ser exposta no
frontend.

## Deploy

O site é publicado como página estática pelo GitHub Pages:

<https://evermatos.github.io/bolasso_2026/>

## Sobre

O Bolasso 2026 foi criado para uma competição informal entre amigos. Não possui
vínculo oficial com a FIFA, seleções, casas de apostas ou provedores de odds.
