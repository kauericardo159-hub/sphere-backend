// ==========================================================================
// MÓDULO DE STATUS E PRESENÇA EM TEMPO REAL (status.js) - SPHERE PRO v5.2
// Realtime Database Engine | Zero Ghost Users | Int8 & Schema Sync
// ==========================================================================

(function () {
  'use strict';

  const CONFIG = {
    LIMITE_INATIVIDADE_MS: 2 * 60 * 1000,   // 2 minutos de inatividade -> Ausente
    INTERVALO_VERIFICACAO_MS: 10 * 1000,    // Checagem local de inatividade
    THROTTLE_UPDATE_MS: 3 * 1000,           // Mínimo de tempo entre requisições de UPDATE
    CHANNEL_PRESENCE: 'realtime_presence_v5.2',
    CHANNEL_DB: 'public_status_updates_v5.2'
  };

  let tempoUltimaAtividade = Date.now();
  let ultimaAtualizacaoServidor = 0;
  let canalPresence = null;
  let canalRealtimeDB = null;
  let heartbeatInterval = null;

  let estadoMemoria = {
    userId: null,
    statusAtual: 'offline',
    isManual: false
  };

  // Injeção de CSS Dinâmico com suporte a Estilos Glass e Tags de Cargos
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
        border: 2.5px solid #140b17;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.7); 
        flex-shrink: 0; 
        position: relative;
        box-sizing: border-box; 
        transition: background-color 0.25s ease, box-shadow 0.25s ease;
      }
      
      .status-dot.online { 
        background-color: #23a55a; 
        box-shadow: 0 0 10px rgba(35, 165, 90, 0.6); 
      }
      
      .status-dot.ausente { 
        background-color: #f0b232; 
        box-shadow: 0 0 8px rgba(240, 178, 50, 0.5); 
      }
      .status-dot.ausente::after {
        content: ''; 
        position: absolute; 
        top: -2px; 
        left: -2px; 
        width: 7px; 
        height: 7px;
        background-color: #140b17; 
        border-radius: 50%;
      }

      .status-dot.dnd { 
        background-color: #f23f43; 
        box-shadow: 0 0 10px rgba(242, 63, 67, 0.6); 
      }
      .status-dot.dnd::after {
        content: ''; 
        width: 6px; 
        height: 2px; 
        background-color: #140b17; 
        border-radius: 2px;
      }

      .status-dot.offline { 
        background-color: #80848e; 
      }
      .status-dot.offline::after {
        content: ''; 
        width: 5px; 
        height: 5px; 
        background-color: #140b17; 
        border-radius: 50%;
      }

      .custom-status-text {
        font-size: 0.75rem; 
        color: #b3a5b8; 
        display: inline-flex; 
        align-items: center; 
        gap: 5px;
        max-width: 160px; 
        white-space: nowrap; 
        overflow: hidden; 
        text-overflow: ellipsis; 
        opacity: 0.9;
      }
      .custom-status-emoji { 
        font-style: normal; 
        font-size: 0.88rem; 
        line-height: 1;
      }

      .user-tag {
        font-size: 0.62rem; 
        font-weight: 800; 
        padding: 2px 7px; 
        border-radius: 6px;
        display: inline-flex; 
        align-items: center; 
        gap: 4px; 
        text-transform: uppercase;
        letter-spacing: 0.4px; 
        line-height: 1; 
        user-select: none;
        white-space: nowrap;
      }
      .user-tag.creator { background: linear-gradient(135deg, #ffd700, #ff8c00); color: #000; box-shadow: 0 0 8px rgba(255, 215, 0, 0.4); }
      .user-tag.admin { background: linear-gradient(135deg, #ff2d55, #e02448); color: #fff; box-shadow: 0 0 8px rgba(255, 45, 85, 0.4); }
      .user-tag.mod { background: #00d2ff; color: #000; box-shadow: 0 0 8px rgba(0, 210, 255, 0.3); }
      .user-tag.vip { background: linear-gradient(135deg, #a55eea, #8854d0); color: #fff; box-shadow: 0 0 8px rgba(165, 94, 234, 0.4); }
      .user-tag.member { background: rgba(255, 255, 255, 0.08); color: #b3a5b8; border: 1px solid rgba(255, 255, 255, 0.05); }

      .avatar-status-badge { 
        position: absolute; 
        bottom: 0px; 
        right: 0px; 
        z-index: 5; 
      }
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
        return u && u.id !== undefined && u.id !== null ? Number(u.id) : null;
      }
    } catch (e) {
      console.error('[StatusEngine] Erro ao ler ID logado:', e);
    }
    return null;
  }

  function obterInfoStatus(status) {
    const st = String(status || 'offline').toLowerCase().trim();
    switch (st) {
      case 'online': return { classe: 'online', label: 'Disponível' };
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

  function obterHtmlCustomStatus(frase = '', emoji = '') {
    const temFrase = typeof frase === 'string' && frase.trim() !== '';
    const temEmoji = typeof emoji === 'string' && emoji.trim() !== '';

    if (!temFrase && !temEmoji) return '';

    const fraseLimpa = temFrase
      ? String(frase).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      : '';

    const emojiHtml = temEmoji ? `<i class="custom-status-emoji">${emoji.trim()}</i>` : '';
    const textoHtml = temFrase ? `<span>${fraseLimpa}</span>` : '';

    return `<div class="custom-status-text" title="${fraseLimpa || 'Recado'}">${emojiHtml}${textoHtml}</div>`;
  }

  // Renderiza a Tag de Cargo baseada nas colunas reais da tabela 'usuarios'
  function obterHtmlTag(usuario) {
    if (!usuario) return `<span class="user-tag member">Membro</span>`;
    
    const eCriador = Boolean(usuario.is_creator || usuario.is_criador);
    if (eCriador) return `<span class="user-tag creator"><i class="fa-solid fa-crown"></i> Criador</span>`;

    const eAdmin = Boolean(usuario.is_admin || usuario.role === 'admin');
    if (eAdmin) return `<span class="user-tag admin"><i class="fa-solid fa-shield-cat"></i> Admin</span>`;

    const eMod = Boolean(usuario.is_mod || usuario.role === 'mod');
    if (eMod) return `<span class="user-tag mod"><i class="fa-solid fa-shield-halved"></i> Mod</span>`;

    const eVip = Boolean(usuario.is_vip || usuario.vip);
    if (eVip) return `<span class="user-tag vip"><i class="fa-solid fa-gem"></i> VIP</span>`;

    return `<span class="user-tag member">Membro</span>`;
  }

  function notificarInterfaceStatus(userId, novoStatus) {
    if (userId === null || userId === undefined) return;
    const info = obterInfoStatus(novoStatus);
    const userIdStr = String(userId);
    const elements = document.querySelectorAll(`[data-user-status-id="${userIdStr}"]`);

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
      console.error('[StatusEngine] Erro na sincronização:', err);
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

    if (canalPresence) {
      sb.removeChannel(canalPresence);
      canalPresence = null;
    }

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

    window.addEventListener('online', () => {
      if (!estadoMemoria.isManual) atualizarStatusServidor('online', false);
    });

    window.addEventListener('offline', () => {
      atualizarStatusServidor('offline', true);
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

    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
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

  // Exportações Globais
  window.obterInfoStatus = obterInfoStatus;
  window.obterHtmlStatusDot = obterHtmlStatusDot;
  window.obterHtmlCustomStatus = obterHtmlCustomStatus;
  window.obterHtmlTag = obterHtmlTag;
  window.atualizarStatusServidor = atualizarStatusServidor;
  window.notificarInterfaceStatus = notificarInterfaceStatus;
  window.iniciarPresenceSupabase = iniciarMotorPresenca;
})();
