// ==========================================================================
// MÓDULO DE VERIFICAÇÃO E BLOQUEIO DE BANIMENTO (ban-check.js)
// Project Z v5.0 | Supabase Realtime + Modal Imersivo + Anti-Bypass
// ==========================================================================

(function () {
  'use strict';

  let intervaloChecagemBan = null;
  let canalRealtimeBan = null;

  // Injeta os estilos do Modal de Banimento caso não existam
  (function injetarEstilosBan() {
    if (document.getElementById('ban-check-css')) return;

    const css = `
      .ban-overlay-screen {
        position: fixed;
        inset: 0;
        z-index: 999999;
        background: rgba(10, 5, 14, 0.96);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
        animation: fadeInBan 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes fadeInBan {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1); }
      }
      .ban-card-box {
        max-width: 440px;
        width: 100%;
        background: #180e1b;
        border: 1px solid rgba(255, 45, 85, 0.4);
        border-radius: 20px;
        padding: 28px 24px;
        text-align: center;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.9), 0 0 30px rgba(255, 45, 85, 0.25);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }
      .ban-icon-wrapper {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: rgba(255, 45, 85, 0.15);
        border: 2px solid #ff2d55;
        color: #ff2d55;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.8rem;
        box-shadow: 0 0 20px rgba(255, 45, 85, 0.4);
      }
      .ban-card-box h3 {
        margin: 0;
        font-size: 1.35rem;
        font-weight: 800;
        color: #ffffff;
      }
      .ban-card-box p {
        margin: 0;
        font-size: 0.9rem;
        color: #b3a5b8;
        line-height: 1.5;
      }
      .ban-reason-badge {
        background: rgba(255, 45, 85, 0.1);
        border: 1px dashed rgba(255, 45, 85, 0.3);
        color: #ff477e;
        padding: 8px 14px;
        border-radius: 10px;
        font-size: 0.8rem;
        font-weight: 600;
        width: 100%;
        box-sizing: border-box;
      }
      .btn-ban-entendido {
        width: 100%;
        padding: 12px;
        background: #ff2d55;
        color: #ffffff;
        border: none;
        border-radius: 12px;
        font-size: 0.9rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .btn-ban-entendido:hover {
        background: #e02448;
        box-shadow: 0 4px 14px rgba(255, 45, 85, 0.4);
      }
    `;

    const styleTag = document.createElement('style');
    styleTag.id = 'ban-check-css';
    styleTag.innerHTML = css;
    document.head.appendChild(styleTag);
  })();

  function obterSupabaseBan() {
    return window.supabaseClient || window.supabase || window.sb || null;
  }

  function obterUsuarioLogadoLocal() {
    try {
      const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function expurgarSessaoLocal() {
    localStorage.removeItem('usuario_logado');
    localStorage.removeItem('usuario');
    localStorage.removeItem('user');
    localStorage.removeItem('sb-auth-token');
    sessionStorage.clear();

    if (intervaloChecagemBan) {
      clearInterval(intervaloChecagemBan);
      intervaloChecagemBan = null;
    }

    const sb = obterSupabaseBan();
    if (canalRealtimeBan && sb) {
      sb.removeChannel(canalRealtimeBan);
      canalRealtimeBan = null;
    }
  }

  function exibirTelaBloqueioBan(motivo = 'Violação das diretrizes da comunidade.') {
    expurgarSessaoLocal();

    // Remove overlays antigas se houver
    const antiga = document.getElementById('ban-overlay-screen');
    if (antiga) antiga.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ban-overlay-screen';
    overlay.className = 'ban-overlay-screen';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
      <div class="ban-card-box">
        <div class="ban-icon-wrapper">
          <i class="fa-solid fa-user-slash"></i>
        </div>
        <h3>Conta Banida</h3>
        <p>Sua conta foi suspensa permanentemente por violação dos termos de uso da nossa comunidade.</p>
        <div class="ban-reason-badge">
          <i class="fa-solid fa-circle-exclamation"></i> Motivo: ${motivo}
        </div>
        <button type="button" class="btn-ban-entendido" onclick="window.location.reload()">
          Entendido / Voltar ao Início
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Oculta telas de aplicação principal
    const homeScreen = document.getElementById('home-screen');
    if (homeScreen) homeScreen.classList.add('hidden');
  }

  async function verificarBanimento() {
    const usuarioLogado = obterUsuarioLogadoLocal();
    if (!usuarioLogado || !usuarioLogado.id) return;

    const sb = obterSupabaseBan();
    if (!sb) return;

    try {
      const { data: user, error } = await sb
        .from('usuarios')
        .select('is_banned, ban_reason')
        .eq('id', usuarioLogado.id)
        .single();

      if (error) {
        console.warn('[BanCheck] Falha na requisição de validação:', error);
        return;
      }

      if (user && user.is_banned) {
        exibirTelaBloqueioBan(user.ban_reason || 'Violação dos termos da comunidade.');
      }
    } catch (err) {
      console.error('[BanCheck] Erro inesperado ao checar ban:', err);
    }
  }

  // Escuta no Supabase Realtime para Banimento Instantâneo (ao vivo)
  function iniciarInscricaoRealtimeBan() {
    const usuarioLogado = obterUsuarioLogadoLocal();
    const sb = obterSupabaseBan();

    if (!sb || !usuarioLogado || !usuarioLogado.id) return;

    if (canalRealtimeBan) {
      sb.removeChannel(canalRealtimeBan);
    }

    canalRealtimeBan = sb
      .channel(`public:ban_check_${usuarioLogado.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'usuarios',
        filter: `id=eq.${usuarioLogado.id}`
      }, (payload) => {
        if (payload.new && payload.new.is_banned) {
          exibirTelaBloqueioBan(payload.new.ban_reason || 'Violação dos termos da comunidade.');
        }
      })
      .subscribe();
  }

  // Inicialização no DOM
  document.addEventListener('DOMContentLoaded', () => {
    verificarBanimento();
    iniciarInscricaoRealtimeBan();

    // Polling de backup a cada 25 segundos
    if (!intervaloChecagemBan) {
      intervaloChecagemBan = setInterval(verificarBanimento, 25000);
    }
  });

  // Exportações Globais
  window.verificarBanimento = verificarBanimento;
  window.exibirTelaBloqueioBan = exibirTelaBloqueioBan;
})();
