# Corporate Intensive Mídias — Aplicativo online

## O que foi preservado
Todo o conteúdo e a experiência dos 62 temas do HTML original, incluindo animações e atividades interativas. O armazenamento local foi substituído por Supabase Auth + banco de dados.

## Instalação
1. Crie um **novo projeto Supabase** específico para o treinamento (não reutilize o banco da rifa nem do app financeiro). No SQL Editor, execute `schema.sql`.
2. Em **Authentication > Providers**, deixe Email ativado. Confirmação por e-mail é recomendada. Configure o SMTP antes de convidar muitos alunos; o e-mail padrão tem limites.
3. Em **Authentication > URL Configuration**, cadastre a URL pública do Cloudflare Pages como Site URL e adicione `https://SEU-SITE.pages.dev/**` como redirect permitido.
4. Em **Project Settings > API**, copie Project URL e chave **publishable** (ou anon, se necessário) para `config.js`. **Nunca** use service_role.
5. Envie estes arquivos à raiz de um repositório GitHub. No Cloudflare Pages, crie projeto > Connect to Git, selecione o repositório. **Build command** vazio; **output directory** `/` (ou `.` de acordo com a interface). Como é um site estático, não precisa rodar build.
6. Abra o app, cadastre a conta administradora e confirme o e-mail. No SQL Editor, execute apenas o `INSERT` comentado no final de `schema.sql`, trocando pelo e-mail cadastrado. A conta passa a ver link Admin.

## Segurança
- Respostas isoladas por participante com RLS; a conta admin só recebe autorização via tabela `training_admins` (não basta editar JavaScript ou metadados).
- Senhas são gerenciadas pelo Supabase Auth.
- Sem senha universal de administrador embutida no código.
- O administrador usa a própria conta autorizada para acessar `/admin.html`.

## Relatórios
Painel de participantes, atividades respondidas, slides visitados, filtro por atividade/busca, respostas completas e CSV.

## Observações
- O projeto é fornecido configurável, sem associação a projeto de produção existente nem publicação automática.
- O progresso marca slides visitados, não tempo de leitura, aprendizado ou conclusão real.
- As atividades 56 e 57 compartilham intencionalmente o mesmo registro no HTML original; aqui permanecem separadas por `activity_id` (o formulário de cada uma é independente).
- Para dados pessoais, informe a finalidade do uso, defina prazo de retenção e disponibilize um canal de exclusão, conforme exigências aplicáveis da LGPD.
