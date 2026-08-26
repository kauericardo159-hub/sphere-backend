// ==========================================================================
// MÓDULO DE STATUS E PRESENÇA EM TEMPO REAL (status.js)
// Project Z v5.0 | Supabase Presence Realtime & Fechamento Garantido
// ==========================================================================

(function injetarEstilosStatus() {
  if (document.getElementById('status-css')) return;

  const css = `
    .status-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 2.5px solid #120a14;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
      flex-shrink: 0;
      position: relative;
      box-sizing: border-box;
      transition: background-color 0.25s ease;
    }
    .status-dot.online { background-color: #23a55a; }
    .status-dot.ausente { background-color: #f0b232; }
    .status-dot.ausente::after {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      width: 8px;
      height: 8px;
      background-color: #120a14;
      border-radius: 50%;
    }
    .status-dot.dnd { background-color: #f23f43; }
    .status-dot.dnd::after {
      content: '';
      width: 6px;
      height: 2px;
      background-color: #120a14;
      border-radius: 2px;
    }
    .status-dot.offline { background-color: #80848e; }
    .status-dot.offline::after {
      content: '';
      width: 5px;
      height: 5px;
      background-color: #120a14;
      border-radius: 50%;
    }
    .custom-status-text {
      font-size: 0.73rem;
      color: #b3a5b8;
      display: flex;
      align-items: center;
      gap: 5px;
      max-width: 140px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .custom-status-emoji { font-style: normal; font-size: 0.85rem; }
    .user-tag {
      font-size: 0.62rem;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      line-height: 1;
    }
    .user-tag.creator { background: linear-gradient(135deg, #ffd700, #ff8c00); color: #000; box-shadow: 0 0 8px rgba(255, 215, 0, 0.35); }
    .user-tag.mod { background: #00d2ff; color: #000; }
    .user-tag.member { background: rgba(255, 255, 255, 0.08); color: #b3a5b8; }
    .avatar-status-badge { position: absolute; bottom: -2px; right: -2px; z-index: 5; }
  `;

  const styleTag = document.createElement('style');
  styleTag.id = 'status-css';
  styleTag.innerHTML = css;
  document.head.appendChild(styleTag);
})();

function obterInfoStatus(status) {
  const st = (status || 'offline').toLowerCase();
  switch (st) {
    case 'ausente':
    case 'idle':
    case 'ausente_auto':
      return { classe: 'ausente', label: 'Ausente' };
    case 'dnd':
    case 'ocupado':
      return { classe: 'dnd', label: 'Não Perturbe' };
    case 'online':
      return { classe: 'online', label: 'Online' };
    case 'offline':
    case 'invisivel':
    default:
      return { classe: 'offline', label: 'Offline' };
  }
}

function obterHtmlStatusDot(status) {
  const info = obterInfoStatus(status);
  return `<span class="status-dot ${info.classe}" data-status-indicator="${info.classe}" title="${info.label}"></span>`;
}

function obterHtmlTag(usuario) {
  if (!usuario) return `<span class="user-tag member">Membro</span>`;
  if (usuario.is_creator) return `<span class="user-tag creator" title="Criador da Comunidade"><i class="fa-solid fa-crown"></i> Criador</span>`;
  if (usuario.role === 'mod' || usuario.role === 'admin') return `<span class="user-tag mod" title="Moderador"><i class="fa-solid fa-shield-halved"></i> Mod</span>`;
  return `<span class="user-tag member">Membro</span>`;
}

function obterSupabase() {
  return window.supabaseClient || window.supabase || window.sb || null;
}

function obterUsuarioLocal() {
  try {
    const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

let tempoInatividade = Date.now();
let canalPresence = null;
let canalRealtimeDB = null;
const LIMITE_INATIVIDADE_MS = 2 * 60 * 1000; // 2 minutos

// Atualiza o status respeitando as regras manuais do usuário
async function atualizarStatusServidor(novoStatus, forcar = false) {
  const userLogado = obterUsuarioLocal();
  if (!userLogado || !userLogado.id) return;

  const statusAtual = (userLogado.status || 'online').toLowerCase();

  // REGRA: Se o usuário colocou "Não Perturbe" ou "Offline" manualmente, o sistema automático NÃO altera para online/ausente
  if (!forcar && (statusAtual === 'dnd' || statusAtual === 'ocupado' || statusAtual === 'offline') && (novoStatus === 'online' || novoStatus === 'ausente')) {
    return;
  }

  if (userLogado.status !== novoStatus || forcar) {
    userLogado.status = novoStatus;
    userLogado.last_seen = new Date().toISOString();
    localStorage.setItem('usuario_logado', JSON.stringify(userLogado));

    const sb = obterSupabase();
    if (sb) {
      try {
        await sb
          .from('usuarios')
          .update({ 
            status: novoStatus,
            last_seen: new Date().toISOString()
          })
          .eq('id', userLogado.id);
      } catch (err) {
        console.error('[Status] Erro ao sincronizar status:', err);
      }
    }

    notificarInterfaceStatus(userLogado.id, novoStatus);
  }
}

// Atualiza os pontos de status no DOM em tempo real
function notificarInterfaceStatus(userId, novoStatus) {
  const info = obterInfoStatus(novoStatus);

  document.querySelectorAll(`[data-user-status-id="${userId}"]`).forEach((el) => {
    el.className = `status-dot ${info.classe}`;
    el.setAttribute('title', info.label);
    el.setAttribute('data-status-indicator', info.classe);
  });
}

// Presence do Supabase em Tempo Real
function iniciarPresenceSupabase() {
  const sb = obterSupabase();
  const user = obterUsuarioLocal();
  if (!sb || !user || !user.id) return;

  if (canalPresence) {
    sb.removeChannel(canalPresence);
  }

  canalPresence = sb.channel('online-users-presence', {
    config: {
      presence: {
        key: String(user.id),
      },
    },
  });

  canalPresence
    .on('presence', { event: 'sync' }, () => {
      const state = canalPresence.presenceState();
      const idsAtivos = Object.keys(state);

      // Marca visualmente no DOM quem realmente tem socket ativo
      document.querySelectorAll('[data-user-status-id]').forEach((el) => {
        const id = el.getAttribute('data-user-status-id');
        if (id && !idsAtivos.includes(String(id))) {
          // Mantém dnd ou offline se estiver no banco, mas se for antigo ajusta
          if (el.classList.contains('online') || el.classList.contains('ausente')) {
            el.className = 'status-dot offline';
            el.setAttribute('title', 'Offline');
          }
        }
      });
    })
    .on('presence', { event: 'leave' }, ({ leftPresences }) => {
      if (leftPresences && Array.isArray(leftPresences)) {
        leftPresences.forEach((p) => {
          if (p.user_id) {
            notificarInterfaceStatus(p.user_id, 'offline');
          }
        });
      }
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await canalPresence.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
        });
      }
    });

  // Ouve atualizações da tabela 'usuarios' para refletir na hora na tela
  if (!canalRealtimeDB) {
    canalRealtimeDB = sb
      .channel('public:status_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'usuarios' }, (payload) => {
        if (payload.new && payload.new.id) {
          notificarInterfaceStatus(payload.new.id, payload.new.status);
        }
      })
      .subscribe();
  }
}

function registrarAtividade() {
  tempoInatividade = Date.now();

  if (!navigator.onLine) {
    atualizarStatusServidor('offline', true);
    return;
  }

  const userLogado = obterUsuarioLocal();
  if (userLogado) {
    const statusAtual = (userLogado.status || '').toLowerCase();
    if (statusAtual === 'ausente' || statusAtual === 'ausente_auto') {
      atualizarStatusServidor('online');
    }
  }
}

// Envio garantido no fechamento da página
function enviarOfflineAoFechar() {
  const user = obterUsuarioLocal();
  const sb = obterSupabase();
  if (!user || !user.id || !sb) return;

  const url = `${sb.supabaseUrl}/rest/v1/usuarios?id=eq.${user.id}`;
  const payload = JSON.stringify({ status: 'offline', last_seen: new Date().toISOString() });

  if (navigator.sendBeacon) {
    const headers = {
      'type': 'application/json',
      'apikey': sb.supabaseKey,
      'Authorization': `Bearer ${sb.supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };
    const blob = new Blob([payload], headers);
    navigator.sendBeacon(url, blob);
  } else {
    fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': sb.supabaseKey,
        'Authorization': `Bearer ${sb.supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: payload,
      keepalive: true
    }).catch(() => {});
  }
}

function iniciarGerenciadorAutomatico() {
  iniciarPresenceSupabase();

  const eventosInteracao = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
  eventosInteracao.forEach((evento) => {
    window.addEventListener(evento, registrarAtividade, { passive: true });
  });

  document.addEventListener('visibilitychange', () => {
    const userLogado = obterUsuarioLocal();
    if (!userLogado) return;
    
    const statusAtual = (userLogado.status || '').toLowerCase();

    if (document.hidden) {
      if (statusAtual === 'online') {
        atualizarStatusServidor('ausente');
      }
    } else {
      tempoInatividade = Date.now();
      if (statusAtual === 'ausente' || statusAtual === 'ausente_auto') {
        atualizarStatusServidor('online');
      }
    }
  });

  window.addEventListener('offline', () => atualizarStatusServidor('offline', true));
  window.addEventListener('online', () => {
    tempoInatividade = Date.now();
    const userLogado = obterUsuarioLocal();
    if (userLogado && userLogado.status !== 'dnd') {
      atualizarStatusServidor('online');
    }
  });

  // Gatilho de saída (fechando aba/navegador)
  window.addEventListener('beforeunload', enviarOfflineAoFechar);
  window.addEventListener('pagehide', enviarOfflineAoFechar);

  // Intervalo de inatividade a cada 10s
  setInterval(() => {
    if (!navigator.onLine) return;

    const userLogado = obterUsuarioLocal();
    if (!userLogado) return;

    const statusAtual = (userLogado.status || '').toLowerCase();

    if (Date.now() - tempoInatividade >= LIMITE_INATIVIDADE_MS && !document.hidden) {
      if (statusAtual === 'online') {
        atualizarStatusServidor('ausente');
      }
    }
  }, 10000);

  // Status Inicial
  const userLogado = obterUsuarioLocal();
  if (userLogado && userLogado.status) {
    atualizarStatusServidor(userLogado.status, true);
  } else if (navigator.onLine) {
    atualizarStatusServidor('online', true);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  iniciarGerenciadorAutomatico();
});

// Exportações Globais
window.obterInfoStatus = obterInfoStatus;
window.obterHtmlStatusDot = obterHtmlStatusDot;
window.obterHtmlTag = obterHtmlTag;
window.atualizarStatusServidor = atualizarStatusServidor;
window.notificarInterfaceStatus = notificarInterfaceStatus;
