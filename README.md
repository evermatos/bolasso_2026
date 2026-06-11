# Bolasso 2026

Bolão responsivo para a Copa do Mundo de 2026. A interface é publicada
gratuitamente no GitHub Pages e os dados ficam no Supabase.

## O que já funciona

- Cadastro e login com e-mail e senha
- 72 jogos da fase de grupos já cadastrados
- Datas e horários exibidos no horário de Abu Dhabi (`Asia/Dubai`, UTC+4)
- Palpites editáveis até cinco minutos antes do início de cada jogo
- Pontuação e ranking calculados no banco
- Área de administrador para publicar ou corrigir resultados
- Layout responsivo para celular e computador
- Deploy automático no GitHub Pages

## Regra de pontuação

| Acerto | Pontos |
| --- | ---: |
| Placar exato | 5 |
| Vencedor/empate + gols exatos de uma seleção | 4 |
| Apenas vencedor ou empate | 3 |
| Apenas gols exatos de uma seleção | 1 |
| Nenhum acerto | 0 |

O cálculo existe em `supabase/schema.sql` e em `src/lib/scoring.ts`.

## Arquitetura

O GitHub Pages não executa servidor nem oferece banco de dados. Por isso:

- **GitHub Pages**: hospeda os arquivos React já compilados.
- **Supabase**: oferece PostgreSQL, autenticação e regras de segurança.
- **GitHub Actions**: testa, compila e publica o site a cada `push` na `main`.

O plano gratuito do Supabase costuma ser suficiente para um bolão entre
amigos. Consulte os limites atuais antes de lançar.

## Rodar localmente

Requer Node.js 22 ou mais recente.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Preencha o `.env.local` antes de abrir a aplicação. Sem um Supabase válido,
o site mostra uma tela de indisponibilidade e não aceita dados locais.

## Configurar o banco

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra **SQL Editor**, copie `supabase/schema.sql` e execute.
3. Em **Authentication > URL Configuration**, defina:
   - Site URL: `https://evermatos.github.io/bolasso_2026/`
   - Redirect URL: `https://evermatos.github.io/bolasso_2026/**`
   - Para desenvolvimento, adicione também `http://localhost:5173/**`.
4. Em **Authentication > Sign In / Providers > Email**, mantenha o provedor
   de e-mail ativo e desative **Confirm email**. Isso permite cadastro
   imediato sem envio de mensagens.
5. Em **Project Settings > API**, copie a URL e a chave `Publishable`.
6. Preencha `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE_PUBLICA
```

Crie sua conta pelo site e depois execute no SQL Editor:

```sql
update public.profiles
set is_admin = true
where id = (
  select id from auth.users where email = 'SEU_EMAIL'
);
```

Nunca coloque uma chave `secret` ou `service_role` no projeto ou no GitHub.
A chave `Publishable` é própria para uso no navegador e é protegida pelas
políticas RLS do banco.

### Contas antigas criadas por magic link

Uma conta criada anteriormente por magic link pode não possuir senha. Para
um projeto ainda sem palpites reais, a migração mais simples é:

1. Abra **Authentication > Users** no Supabase.
2. Exclua a conta antiga.
3. Crie a conta novamente pelo site usando uma senha.
4. Execute novamente o SQL que define `is_admin = true`.

Excluir um usuário também exclui seu perfil e seus palpites. Não faça isso
depois que o bolão já estiver em uso. Nesse caso, configure SMTP e use a
recuperação de senha.

## Administrador e resultados

Somente contas com `profiles.is_admin = true` veem a aba **Administração**.
Nela, o administrador informa o placar final e seleciona **Publicar
resultado**.

O banco:

- rejeita resultados antes do início da partida;
- permite corrigir um resultado já publicado;
- recalcula os pontos de todos os participantes;
- atualiza o ranking imediatamente.

Para conferir os administradores:

```sql
select display_name, is_admin
from public.profiles
order by display_name;
```

## Cadastrar jogos

O `supabase/schema.sql` já contém as 72 partidas da fase de grupos, conforme
a tabela publicada para a Copa do Mundo de 2026. A agenda foi conferida em
11 de junho de 2026 usando:

- [FIFA — Scores & Fixtures](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures)
- [ESPN — FIFA World Cup Schedule](https://www.espn.com/soccer/schedule/_/league/fifa.world)

Os timestamps do arquivo SQL estão escritos em `UTC+4`, para ficarem fáceis
de auditar como horário de Abu Dhabi. O PostgreSQL guarda o instante absoluto,
e a interface sempre formata a exibição com o fuso `Asia/Dubai`.

Para adicionar uma partida futura, use um `match_number` ainda não cadastrado:

```sql
insert into public.matches
  (match_number, home_team, away_team, home_flag, away_flag,
   stage, kickoff_at, venue)
values
  (73, 'Seleção A', 'Seleção B', '⚽', '⚽', 'Fase eliminatória',
   '2026-06-28 23:00:00+04', 'Nome do estádio');
```

O banco rejeita inserções e alterações de palpites a partir de cinco minutos
antes do início da partida. Esse controle é aplicado por Row Level Security,
portanto não pode ser contornado modificando o JavaScript no navegador.

## Publicar no GitHub Pages

1. No repositório do GitHub, abra **Settings > Secrets and variables >
   Actions**.
2. Crie os secrets `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Abra **Settings > Pages** e escolha **GitHub Actions** em **Source**.
4. Envie as alterações para a branch `main`.

Depois do workflow terminar, o site ficará em:

<https://evermatos.github.io/bolasso_2026/>

## Checklist de produção

Antes de enviar o link aos participantes:

1. Execute `supabase/schema.sql` em um projeto Supabase novo.
2. Crie sua conta pelo site e marque-a como administradora.
3. Configure as URLs de redirecionamento do Supabase.
4. Adicione os dois secrets no GitHub Actions.
5. Habilite o GitHub Pages usando **GitHub Actions**.
6. Confirme que cadastro, login, palpite e publicação de resultado funcionam.

Não existe armazenamento de demonstração ou fallback no navegador. Todos os
usuários, palpites e resultados da versão publicada usam o Supabase.

## Comandos

```bash
npm run dev      # servidor local
npm test         # testes da pontuação
npm run lint     # análise estática
npm run build    # build de produção
```
