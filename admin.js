
import { createClient } from
  'https://esm.sh/@supabase/supabase-js@2.49.8';

import {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
} from './config.js';

const c = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const $ = id => document.getElementById(id);

let rows = [];
let profiles = [];
let role = null;

const activityNames = {
  1: 'Sucesso',
  5: 'Decisão narrativa',
  14: 'Minha história',
  17: 'Capítulos da história',
  26: 'Diagnóstico',
  31: 'Identidade',
  35: 'Opositor e bandeira',
  43: 'Mensagem completa',
  56: 'Missão prática',
  57: 'Roteiro autoral',
  58: 'Teste da mensagem'
};

function escapeHTML(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[ch]
  );
}

async function all(table, columns) {
  const result = [];

  for (let from = 0; ; from += 1000) {
    const { data, error } = await c
      .from(table)
      .select(columns)
      .range(from, from + 999);

    if (error) throw error;

    result.push(...data);

    if (data.length < 1000) return result;
  }
}

async function load() {
  const { data: { user } } = await c.auth.getUser();

  if (!user) {
    $('login').hidden = false;
    $('mainview').hidden = true;
    return;
  }

  const { data: admin, error } = await c
    .from('training_admins')
    .select('user_id,role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !admin) {
    $('login').hidden = false;
    $('mainview').hidden = true;
    $('login-msg').textContent =
      'Esta conta não possui permissão administrativa.';
    return;
  }

  role = admin.role;

  try {
    [profiles, rows] = await Promise.all([
      all(
        'training_profiles',
        'id,full_name,email'
      ),
      all(
        'training_answers',
        'user_id,activity_id,response,updated_at'
      )
    ]);

    const progress = await all(
      'training_progress',
      'user_id,slide_id'
    );

    $('participants').textContent = profiles.length;
    $('responses').textContent = rows.length;
    $('slides').textContent = progress.length;

    $('login').hidden = true;
    $('mainview').hidden = false;

    $('role-label').textContent =
      role === 'owner'
        ? 'Acesso: Organizador principal'
        : 'Acesso: Administrador';

    $('owners-section').hidden = role !== 'owner';

    const ids = [
      ...new Set(rows.map(r => r.activity_id))
    ].sort((a, b) => a - b);

    $('activity').innerHTML =
      '<option value="">Todas as atividades</option>' +
      ids.map(n =>
        `<option value="${n}">
          ${n} — ${escapeHTML(
            activityNames[n] || 'Atividade'
          )}
        </option>`
      ).join('');

    draw();

    if (role === 'owner') {
      await loadAdmins();
    }
  } catch (e) {
    $('login-msg').textContent =
      'Erro de consulta: ' + e.message;
  }
}

function filtered() {
  const query = $('search').value.toLocaleLowerCase('pt-BR');
  const activity = $('activity').value;

  return rows.filter(r => {
    const p = profiles.find(
      item => item.id === r.user_id
    ) || {};

    const matchesActivity =
      !activity || String(r.activity_id) === activity;

    const matchesQuery =
      !query ||
      JSON.stringify([
        p.full_name,
        p.email,
        r.response
      ]).toLocaleLowerCase('pt-BR').includes(query);

    return matchesActivity && matchesQuery;
  });
}

function draw() {
  const data = filtered();
  const map = new Map(
    profiles.map(p => [p.id, p])
  );

  $('count').textContent =
    `${data.length} registro(s)`;

  $('rows').innerHTML = data
    .sort((a, b) =>
      b.updated_at.localeCompare(a.updated_at)
    )
    .map(r => {
      const p = map.get(r.user_id) || {};

      const response = Object.entries(
        r.response || {}
      ).map(([key, value]) =>
        `<div>
          <b>${escapeHTML(key)}:</b>
          ${escapeHTML(
            typeof value === 'object'
              ? JSON.stringify(value)
              : value
          )}
        </div>`
      ).join('');

      return `
        <tr>
          <td>
            <b>${escapeHTML(
              p.full_name || 'Sem nome'
            )}</b>
            <div class="muted">
              ${escapeHTML(p.email || r.user_id)}
            </div>
          </td>
          <td>
            ${r.activity_id} —
            ${escapeHTML(
              activityNames[r.activity_id] || 'Atividade'
            )}
          </td>
          <td>${response}</td>
          <td>
            ${escapeHTML(
              new Date(r.updated_at)
                .toLocaleString('pt-BR')
            )}
          </td>
        </tr>
      `;
    }).join('');
}

async function loadAdmins() {
  if (role !== 'owner') return;

  const { data, error } = await c.rpc(
    'training_list_admins'
  );

  if (error) {
    $('admin-message').textContent =
      'Erro ao carregar administradores: ' +
      error.message;
    return;
  }

  $('admin-rows').innerHTML = (data || [])
    .map(admin => {
      const owner = admin.role === 'owner';

      return `
        <tr>
          <td>${escapeHTML(admin.email)}</td>
          <td>
            ${owner
              ? 'Organizador principal'
              : 'Administrador'}
          </td>
          <td>
            ${admin.registered
              ? 'Conta cadastrada'
              : 'Aguardando cadastro'}
          </td>
          <td>
            ${owner
              ? 'Protegido'
              : `<button
                  class="danger remove-admin"
                  data-email="${escapeHTML(admin.email)}"
                >Remover acesso</button>`}
          </td>
        </tr>
      `;
    }).join('');
}

$('admin-form').onsubmit = async event => {
  event.preventDefault();

  if (role !== 'owner') return;

  const email = $('new-admin-email')
    .value.trim().toLowerCase();

  const button = $('add-admin');
  button.disabled = true;

  $('admin-message').textContent =
    'Adicionando administrador...';

  try {
    const { error } = await c.rpc(
      'training_add_admin',
      { p_email: email }
    );

    if (error) throw error;

    $('admin-message').textContent =
      'Acesso autorizado. Se a pessoa ainda não ' +
      'possui conta, deverá se cadastrar no ' +
      'treinamento e confirmar o e-mail.';

    $('new-admin-email').value = '';

    await loadAdmins();
  } catch (e) {
    $('admin-message').textContent =
      'Erro: ' + e.message;
  } finally {
    button.disabled = false;
  }
};

$('admin-rows').onclick = async event => {
  const button = event.target.closest(
    '.remove-admin'
  );

  if (!button || role !== 'owner') return;

  const email = button.dataset.email;

  if (!confirm(
    `Remover o acesso administrativo de ${email}?`
  )) return;

  button.disabled = true;

  const { error } = await c.rpc(
    'training_remove_admin',
    { p_email: email }
  );

  $('admin-message').textContent = error
    ? 'Erro: ' + error.message
    : 'Permissão administrativa removida.';

  await loadAdmins();
};

$('search').oninput = draw;
$('activity').onchange = draw;

$('csv').onclick = () => {
  const map = new Map(
    profiles.map(p => [p.id, p])
  );

  const lines = [[
    'Nome',
    'Email',
    'Atividade',
    'Campo',
    'Resposta',
    'Atualizado'
  ]];

  for (const r of filtered()) {
    const p = map.get(r.user_id) || {};

    for (const [key, value] of Object.entries(
      r.response || {}
    )) {
      lines.push([
        p.full_name || '',
        p.email || '',
        r.activity_id,
        key,
        typeof value === 'object'
          ? JSON.stringify(value)
          : String(value),
        r.updated_at
      ]);
    }
  }

  const csv = '\ufeff' + lines.map(line =>
    line.map(value =>
      '"' + String(value ?? '')
        .replaceAll('"', '""') + '"'
    ).join(';')
  ).join('\r\n');

  const url = URL.createObjectURL(
    new Blob([csv], {
      type: 'text/csv;charset=utf-8'
    })
  );

  const link = document.createElement('a');
  link.href = url;
  link.download = 'relatorio-corporate-intensive.csv';
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

$('login-form').onsubmit = async event => {
  event.preventDefault();

  $('login-msg').textContent = 'Autenticando...';

  const { error } = await c.auth.signInWithPassword({
    email: $('email').value.trim(),
    password: $('pass').value
  });

  if (error) {
    $('login-msg').textContent = error.message;
    return;
  }

  $('login-msg').textContent = '';
  await load();
};

$('logout').onclick = async () => {
  await c.auth.signOut();
  location.reload();
};

await load();
