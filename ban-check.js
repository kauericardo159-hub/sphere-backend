// ==========================================================================
// MÓDULO DE VERIFICAÇÃO E BLOQUEIO DE BANIMENTO (ban-check.js)
// Sphere v5.2 | Supabase Realtime CDC + Anti-Bypass + Modal Imersivo
// ==========================================================================

(function () {
  'use strict';

  let intervaloChecagemBan = null;
  let canalRealtimeBan = null;

  // Helper de Sanitização XSS
  function sanitizarTextoBan(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Injeta os estilos do Modal de Banimento do Sphere
  (function injetarEstilosBan() {
    if (document.getElementById('ban-check-css')) return;

    const css = `
      .ban-overlay-screen {
        position: fixed;
        inset: 0;
        z-index: 999999;
        background: rgba(10, 5, 14, 0.96);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
        animation: fadeInBan 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        user-select: none;
      }
      @keyframes fadeInBan {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      .ban-card-box {
        max-width: 460px;
        width: 100%;
        background: linear-gradient(160deg, rgba(26, 12, 28, 0.98) 0%, rgba(14, 6, 16, 0.99) 100%);
        border: 1px solid rgba(255, 45, 85, 0.45);
        border-radius: 24px;
        padding: 32px 26px;
        text-align: center;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.95), 0 0 35px rgba(255, 45, 85, 0.25);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 18px;
        box-sizing: border-box;
      }
      .ban-icon-wrapper {
        width: 68px;
        height: 68px;
        border-radius: 50%;
        background: rgba(255, 45, 85, 0.15);
        border: 2px solid #ff2d55;
        color: #ff2d55;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.9rem;
        box-shadow: 0 0 25px rgba(255, 45, 85, 0.45);
        animation: pulseBanIcon 2s infinite;
      }
      @keyframes pulseBanIcon {
        0% { box-shadow: 0 0 0 0 rgba(255, 45, 85, 0.4); }
        70% { box-shadow: 0 0 0 12px rgba(255, 45, 85, 0); }
        100% { box-shadow: 0 0 0 0 rgba(255, 45, 85, 0); }
      }
      .ban-card-box h3 {
        margin: 0;
        font-size: 1.4rem;
        font-weight: 900;
        color: #ffffff;
        letter-spacing: 0.5px;
      }
      .ban-card-box p {
        margin: 0;
        font-size: 0.9rem;
        color: #b3a5b8;
        line-height: 1.5;
      }
      .ban-reason-box {
        background: rgba(255, 45, 85, 0.08);
        border: 1px dashed rgba(255, 45, 85, 0.35);
        color: #ff477e;
        padding: 12px 16px;
        border-radius: 14px;
        font-size: 0.85rem;
        font-weight: 600;
        width: 100%;
        box-sizing: border-box;
        text-align: left;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .ban-reason-title {
        font-size: 0.72rem;
        text-transform: uppercase;
        font-weight: 800;
        color: #ff2d55;
        letter-spacing: 0.6px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .ban-reason-text {
        color: #ffffff;
        font-size: 0.88rem;
        word-break: break-word;
        line-height: 1.4;
      }
      .btn-ban-entendido {
        width: 100%;
        height: 44px;
        background: linear-gradient(135deg, #ff2d55 0%, #e02448 100%);
        color: #ffffff;
        border: none;
        border-radius: 14px;
        font-size: 0.92rem;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.25s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 4px 15px rgba(255, 45, 85, 0.4);
      }
      .btn-ban-entendido:hover {
        background: #ffffff;
        color: #ff2d55;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(255, 255, 255, 0.4);
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
      const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
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

  function exibirTelaBloqueioBan(motivo) {
    const motivoFinal = motivo || 'Violação das diretrizes e termos de uso da comunidade.';
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
        <h3>Conta Suspensa</h3>
        <p>Sua conta foi permanentemente banida do Sphere devido ao descumprimento das regras de convivência.</p>
        
        <div class="ban-reason-box">
          <span class="ban-reason-title">
            <i class="fa-solid fa-triangle-exclamation"></i> Motivo do Banimento
          </span>
          <span class="ban-reason-text">${sanitizarTextoBan(motivoFinal)}</span>
        </div>

        <button type="button" class="btn-ban-entendido" onclick="window.location.reload()">
          <i class="fa-solid fa-rotate-right"></i> Entendido / Ir para Login
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Desabilita rolagem da página
    document.body.style.overflow = 'hidden';

    // Oculta telas principais da aplicação
    const homeScreen = document.getElementById('home-screen');
    if (homeScreen) homeScreen.classList.add('hidden');

    const authCard = document.getElementById('auth-card');
    if (authCard) authCard.classList.add('hidden');
  }

  async function verificarBanimento() {
    const usuarioLogado = obterUsuarioLogadoLocal();
    if (!usuarioLogado || !usuarioLogado.id) return;

    const sb = obterSupabaseBan();
    if (!sb) return;

    try {
      const { data: user, error } = await sb
        .from('usuarios')
        .select('is_banned, ban_reason, motivo_ban')
        .eq('id', usuarioLogado.id)
        .single();

      if (error) {
        console.warn('[BanCheck] Falha na validação remota de banimento:', error);
        return;
      }

      if (user && user.is_banned) {
        const motivo = user.ban_reason || user.motivo_ban || 'Violação dos termos da comunidade.';
        exibirTelaBloqueioBan(motivo);
      }
    } catch (err) {
      console.error('[BanCheck] Erro inesperado ao checar banimento:', err);
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
          const motivo = payload.new.ban_reason || payload.new.motivo_ban || 'Violação dos termos da comunidade.';
          exibirTelaBloqueioBan(motivo);
        }
      })
      .subscribe();
  }

  // Inicialização no DOM
  document.addEventListener('DOMContentLoaded', () => {
    verificarBanimento();
    iniciarInscricaoRealtimeBan();

    // Polling de backup a cada 20 segundos
    if (!intervaloChecagemBan) {
      intervaloChecagemBan = setInterval(verificarBanimento, 20000);
    }
  });

  // Exportações Globais
  window.verificarBanimento = verificarBanimento;
  window.exibirTelaBloqueioBan = exibirTelaBloqueioBan;
})();
