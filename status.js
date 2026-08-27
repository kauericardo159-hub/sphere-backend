// ==========================================================================
// MÓDULO DE STATUS E PRESENÇA EM TEMPO REAL (status.js)
// Project Z v5.0 | Supabase Database-First Presence Engine (No LocalStorage State)
// ==========================================================================

(function () {
  'use strict';

  const CONFIG = {
    LIMITE_INATIVIDADE_MS: 2 * 60 * 1000, // 2 minutos para Ausente automático
    INTERVALO_VERIFICACAO_MS: 10 * 1000,   // Verificação a cada 10s
    CHANNEL_PRESENCE: 'realtime_presence_v5',
    CHANNEL_DB: 'public_status_updates_v5'
  };

  let tempoUltimaAtividade = Date.now();
  let canalPresence = null;
  let canalRealtimeDB = null;
  
  // Cache de memória apenas para a sessão ativa no navegador
  let estadoMemoria = {
    userId: null,
    statusAtual: 'offline',
    isManual: false
  };

  // Injeção dos Estilos CSS Globais
  (function injetarEstilosStatus() {
    if (document.getElementById('status-css-v5')) return;

    const css = `
      .status-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 2.5px solid #120a14;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
        flex-shrink: 0;
        position: relative;
        box-sizing: border-box;
        transition: background-color 0.25s ease, box-shadow 0.25s ease;
      }
      .status-dot.online { background-color: #23a55a; box-shadow: 0 0 10px rgba(35, 165, 90, 0.6); }
      .status-dot.ausente { background-color: #f0b232; box-shadow: 0 0 8px rgba(240, 178, 50, 0.5); }
      .status-dot.ausente::after {
        content: ''; position: absolute; top: -2px; left: -2px; width: 8px; height: 8px;
        background-color: #120a14; border-radius: 50%;
      }
      .status-dot.dnd { background-color: #f23f43; box-shadow: 0 0 10px rgba(242, 63, 67, 0.6); }
      .status-dot.dnd::after {
        content: ''; width: 6px; height: 2px; background-color: #120a14; border-radius: 2px;
      }
      .status-dot.offline { background-color: #80848e; }
      .status-dot.offline::after {
        content: ''; width: 5px; height: 5px; background-color: #120a14; border-radius: 50%;
      }
      .custom-status-text {
        font-size: 0.73rem; color: #b3a5b8; display: flex; align-items: center; gap: 5px;
        max-width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.9;
      }
      .custom-status-emoji { font-style: normal; font-size: 0.88rem; }
      .user-tag {
        font-size: 0.62rem; font-weight: 800; padding: 2px 6px; border-radius: 6px;
        display: inline-flex; align-items: center; gap: 4px; text-transform: uppercase;
        letter-spacing: 0.4px; line-height: 1; user-select: none;
      }
      .user-tag.creator { background: linear-gradient(135deg, #ffd700, #ff8c00); color: #000; }
      .user-tag.admin { background: linear-gradient(135deg, #ff2d55, #e02448); color: #fff; }
      .user-tag.mod { background: #00d2ff; color: #000; }
      .user-tag.vip { background: linear-gradient(135deg, #a55eea, #8854d0); color: #fff; }
      .user-tag.member { background: rgba(255, 255, 255, 0.08); color: #b3a5b8; }
      .avatar-status-badge { position: absolute; bottom: -2px; right: -2px; z-index: 5; }
    `;

    const styleTag = document.createElement('style');
    styleTag.id = 'status-css-v5';
    styleTag.innerHTML = css;
    document.head.appendChild(styleTag);
  })();

  function obterSupabase() {
    return window.supabaseClient || window.supabase || window.sb || null;
  }

  // Apenas lê a ID primária para autenticação no socket
  function obterIdUsuarioLogado() {
    try {
      const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        return u && u.id !== undefined ? Number(u.id) : null;
      }
    } catch (e) {}
    return null;
  }

  function obterInfoStatus(status) {
    const st = String(status || 'offline').toLowerCase().trim();
    switch (st) {
      case 'online': return { classe: 'online', label: 'Online' };
      case 'ausente':
      case 'idle':
      case 'ausente_auto': return { classe: 'ausente', label: 'Ausente' };
      case 'dnd':
      case 'ocupado':
      case 'nao_perturbe': return { classe: 'dnd', label: 'Não Perturbe' };
      case 'offline':
      case 'invisivel':
      default: return { classe: 'offline', label: 'Offline' };
    }
  }

  function obterHtmlStatusDot(status = 'offline', userId = null) {
    const info = obterInfoStatus(status);
    const idAttr = userId !== null && userId !== undefined ? `data-user-status-id="${userId}"` : '';
    return `<span class="status-dot ${info.classe}" ${idAttr} data-status-indicator="${info.classe}" title="${info.label}"></span>`;
  }

  function obterHtmlCustomStatus(frase, emoji = '💬') {
    if (!frase || frase.trim() === '') return '';
    const fraseLimpa = String(frase).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<div class="custom-status-text" title="${fraseLimpa}"><i class="custom-status-emoji">${emoji}</i><span>${fraseLimpa}</span></div>`;
  }

  function obterHtmlTag(usuario) {
    if (!usuario) return `<span class="user-tag member">Membro</span>`;
    if (usuario.is_creator || usuario.is_criador) return `<span class="user-tag creator"><i class="fa-solid fa-crown"></i> Criador</span>`;
    if (usuario.role === 'admin' || usuario.is_admin) return `<span class="user-tag admin"><i class="fa-solid fa-shield-cat"></i> Admin</span>`;
    if (usuario.role === 'mod' || usuario.is_mod) return `<span class="user-tag mod"><i class="fa-solid fa-shield-halved"></i> Mod</span>`;
    if (usuario.is_vip || usuario.vip) return `<span class="user-tag vip"><i class="fa-solid fa-gem"></i> VIP</span>`;
    return `<span class="user-tag member">Membro</span>`;
  }

  // Atualiza o DOM dinamicamente
  function notificarInterfaceStatus(userId, novoStatus) {
    if (userId === null || userId === undefined) return;
    const info = obterInfoStatus(novoStatus);
    const elements = document.querySelectorAll(`[data-user-status-id="${String(userId)}"]`);
    elements.forEach((el) => {
      el.className = `status-dot ${info.classe}`;
      el.setAttribute('title', info.label);
      el.setAttribute('data-status-indicator', info.classe);
    });
  }

  // Grava o status diretamente no Banco de Dados Supabase (Fonte Única da Verdade)
  async function atualizarStatusServidor(novoStatus, forcarManual = false) {
    const userId = estadoMemoria.userId || obterIdUsuarioLogado();
    if (!userId) return;

    const sb = obterSupabase();
    if (!sb) return;

    const stNormalizado = String(novoStatus || 'offline').toLowerCase();

    if (forcarManual) {
      estadoMemoria.isManual = (stNormalizado === 'dnd' || stNormalizado === 'ocupado' || stNormalizado === 'ausente');
    } else if (estadoMemoria.isManual) {
      return; // Se o usuário definiu DND ou Ausente manualmente, ignora interações automáticas do mouse
    }

    estadoMemoria.statusAtual = stNormalizado;

    try {
      await sb
        .from('usuarios')
        .update({
          status: stNormalizado,
          last_seen: new Date().toISOString()
        })
        .eq('id', userId);

      notificarInterfaceStatus(userId, stNormalizado);
    } catch (err) {
      console.error('[StatusEngine] Erro ao sincronizar status no PostgreSQL:', err);
    }
  }

  // Inicializa o Realtime e sincroniza com o banco
  async function iniciarMotorPresenca() {
    const userId = obterIdUsuarioLogado();
    if (!userId) return;

    estadoMemoria.userId = userId;
    const sb = obterSupabase();
    if (!sb) return;

    // 1. Busca o status REAL diretamente do banco PostgreSQL
    try {
      const { data } = await sb.from('usuarios').select('status').eq('id', userId).single();
      if (data && data.status) {
        const statusBanco = String(data.status).toLowerCase();
        estadoMemoria.statusAtual = statusBanco;
        estadoMemoria.isManual = (statusBanco === 'dnd' || statusBanco === 'ocupado' || statusBanco === 'ausente');
        notificarInterfaceStatus(userId, statusBanco);
      }
    } catch (e) {
      console.warn('[StatusEngine] Falha ao consultar status inicial do banco:', e);
    }

    // 2. Conecta ao WebSocket do Realtime Presence
    if (canalPresence) sb.removeChannel(canalPresence);

    canalPresence = sb.channel(CONFIG.CHANNEL_PRESENCE, {
      config: { presence: { key: String(userId) } }
    });

    canalPresence
      .on('presence', { event: 'sync' }, () => {
        const state = canalPresence.presenceState();
        const idsAtivos = Object.keys(state);

        // Quem não está no Presence WebSocket é marcado visualmente como offline
        document.querySelectorAll('[data-user-status-id]').forEach((el) => {
          const id = el.getAttribute('data-user-status-id');
          if (id && String(id) !== String(userId) && !idsAtivos.includes(String(id))) {
            el.className = 'status-dot offline';
            el.setAttribute('title', 'Offline');
            el.setAttribute('data-status-indicator', 'offline');
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        if (Array.isArray(leftPresences)) {
          leftPresences.forEach((p) => {
            if (p.user_id) notificarInterfaceStatus(p.user_id, 'offline');
          });
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await canalPresence.track({
            user_id: userId,
            online_at: new Date().toISOString()
          });

          // Se não tiver status manual travado no banco, assume 'online'
          if (!estadoMemoria.isManual) {
            atualizarStatusServidor('online', false);
          }
        }
      });

    // 3. Ouve alterações CDC no banco de dados para sincronizar múltiplos navegadores/dispositivos
    if (!canalRealtimeDB) {
      canalRealtimeDB = sb
        .channel(CONFIG.CHANNEL_DB)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'usuarios' }, (payload) => {
          if (payload.new && payload.new.id !== undefined) {
            notificarInterfaceStatus(payload.new.id, payload.new.status);
          }
        })
        .subscribe();
    }
  }

  // Detector de atividade do usuário
  function registrarAtividade() {
    tempoUltimaAtividade = Date.now();

    if (!navigator.onLine) {
      atualizarStatusServidor('offline', true);
      return;
    }

    if (!estadoMemoria.isManual && estadoMemoria.statusAtual === 'ausente') {
      atualizarStatusServidor('online', false);
    }
  }

  // Envia desacoplamento ao fechar a janela
  function desconectarAoSair() {
    const userId = estadoMemoria.userId || obterIdUsuarioLogado();
    const sb = obterSupabase();
    if (!userId || !sb) return;

    const url = `${sb.supabaseUrl}/rest/v1/usuarios?id=eq.${userId}`;
    const payload = JSON.stringify({ status: 'offline', last_seen: new Date().toISOString() });

    const headers = {
      'type': 'application/json',
      'apikey': sb.supabaseKey,
      'Authorization': `Bearer ${sb.supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };

    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([payload], headers));
    }
  }

  // Eventos de Ciclo de Vida
  function iniciarListeners() {
    iniciarMotorPresenca();

    ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach((evt) => {
      window.addEventListener(evt, registrarAtividade, { passive: true });
    });

    document.addEventListener('visibilitychange', () => {
      if (estadoMemoria.isManual) return;

      if (document.hidden) {
        if (estadoMemoria.statusAtual === 'online') {
          atualizarStatusServidor('ausente', false);
        }
      } else {
        tempoUltimaAtividade = Date.now();
        if (estadoMemoria.statusAtual === 'ausente') {
          atualizarStatusServidor('online', false);
        }
      }
    });

    window.addEventListener('beforeunload', desconectarAoSair);
    window.addEventListener('pagehide', desconectarAoSair);

    // Checagem periódica de inatividade
    setInterval(() => {
      if (!navigator.onLine || estadoMemoria.isManual) return;

      if (Date.now() - tempoUltimaAtividade >= CONFIG.LIMITE_INATIVIDADE_MS && !document.hidden) {
        if (estadoMemoria.statusAtual === 'online') {
          atualizarStatusServidor('ausente', false);
        }
      }
    }, CONFIG.INTERVALO_VERIFICACAO_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarListeners);
  } else {
    iniciarListeners();
  }

  // Interface Pública
  window.obterInfoStatus = obterInfoStatus;
  window.obterHtmlStatusDot = obterHtmlStatusDot;
  window.obterHtmlCustomStatus = obterHtmlCustomStatus;
  window.obterHtmlTag = obterHtmlTag;
  window.atualizarStatusServidor = atualizarStatusServidor;
  window.notificarInterfaceStatus = notificarInterfaceStatus;
  window.iniciarPresenceSupabase = iniciarMotorPresenca;
})();
