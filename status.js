          // ==========================================================================
// MÓDULO DE STATUS E PRESENÇA EM TEMPO REAL (status.js) - OTIMIZADO
// Project Z v5.1 | Supabase Database-First Presence Engine
// ==========================================================================

(function () {
  'use strict';

  const CONFIG = {
    LIMITE_INATIVIDADE_MS: 2 * 60 * 1000, 
    INTERVALO_VERIFICACAO_MS: 15 * 1000,   
    THROTTLE_UPDATE_MS: 5 * 1000, // Previne spam de UPDATE no Supabase
    CHANNEL_PRESENCE: 'realtime_presence_v5',
    CHANNEL_DB: 'public_status_updates_v5'
  };

  let tempoUltimaAtividade = Date.now();
  let ultimaAtualizacaoServidor = 0;
  let canalPresence = null;
  let canalRealtimeDB = null;

  let estadoMemoria = {
    userId: null,
    statusAtual: 'offline',
    isManual: false
  };

  (function injetarEstilosStatus() {
    if (document.getElementById('status-css-v5')) return;

    const css = `
      .status-dot {
        width: 14px; height: 14px; border-radius: 50%; display: inline-flex;
        align-items: center; justify-content: center; border: 2.5px solid #120a14;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.7); flex-shrink: 0; position: relative;
        box-sizing: border-box; transition: background-color 0.25s ease, box-shadow 0.25s ease;
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

  async function atualizarStatusServidor(novoStatus, forcarManual = false) {
    const userId = estadoMemoria.userId || obterIdUsuarioLogado();
    if (!userId) return;

    const sb = obterSupabase();
    if (!sb) return;

    const stNormalizado = String(novoStatus || 'offline').toLowerCase();
    const agora = Date.now();

    // Controle de throttling para evitar consumo excessivo de cota no Supabase
    if (!forcarManual && (agora - ultimaAtualizacaoServidor < CONFIG.THROTTLE_UPDATE_MS) && stNormalizado === estadoMemoria.statusAtual) {
      return;
    }

    if (forcarManual) {
      estadoMemoria.isManual = (stNormalizado === 'dnd' || stNormalizado === 'ocupado' || stNormalizado === 'ausente');
    } else if (estadoMemoria.isManual) {
      return;
    }

    estadoMemoria.statusAtual = stNormalizado;
    ultimaAtualizacaoServidor = agora;

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
      console.error('[StatusEngine] Erro ao sincronizar status:', err);
    }
  }

  async function iniciarMotorPresenca() {
    const userId = obterIdUsuarioLogado();
    if (!userId) return;

    estadoMemoria.userId = userId;
    const sb = obterSupabase();
    if (!sb) return;

    try {
      const { data } = await sb.from('usuarios').select('status').eq('id', userId).single();
      if (data && data.status) {
        const statusBanco = String(data.status).toLowerCase();
        estadoMemoria.statusAtual = statusBanco;
        estadoMemoria.isManual = (statusBanco === 'dnd' || statusBanco === 'ocupado' || statusBanco === 'ausente');
        notificarInterfaceStatus(userId, statusBanco);
      }
    } catch (e) {
      console.warn('[StatusEngine] Falha ao consultar status inicial:', e);
    }

    if (canalPresence) sb.removeChannel(canalPresence);

    canalPresence = sb.channel(CONFIG.CHANNEL_PRESENCE, {
      config: { presence: { key: String(userId) } }
    });

    canalPresence
      .on('presence', { event: 'sync' }, () => {
        const state = canalPresence.presenceState();
        const idsAtivos = Object.keys(state);

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

          if (!estadoMemoria.isManual) {
            atualizarStatusServidor('online', false);
          }
        }
      });

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

  function desconectarAoSair() {
    if (canalPresence) {
      canalPresence.untrack();
    }
  }

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

  window.obterInfoStatus = obterInfoStatus;
  window.obterHtmlStatusDot = obterHtmlStatusDot;
  window.obterHtmlCustomStatus = obterHtmlCustomStatus;
  window.obterHtmlTag = obterHtmlTag;
  window.atualizarStatusServidor = atualizarStatusServidor;
  window.notificarInterfaceStatus = notificarInterfaceStatus;
  window.iniciarPresenceSupabase = iniciarMotorPresenca;
})();
