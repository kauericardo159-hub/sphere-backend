/* ==========================================================================
   MÓDULO DE MANUTENÇÃO GLOBAL & REALTIME (SPHERE PRO v5.2)
   ========================================================================== */
(function () {
  'use strict';

  const SUPABASE_URL = "https://phvnxlogznbplynwflch.supabase.co";
  const SUPABASE_KEY = "sb_publishable_CvzU52jm8tRyWBE0g4UvKg_J_nVMIAQ";

  let clientSupabaseLocal = null;
  let canalRealtime = null;
  let emManutencaoEstado = false;

  function obterSupabaseManutencao() {
    if (clientSupabaseLocal) return clientSupabaseLocal;
    if (window.supabaseClient) {
      clientSupabaseLocal = window.supabaseClient;
      return clientSupabaseLocal;
    }
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      clientSupabaseLocal = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      window.supabaseClient = clientSupabaseLocal;
      return clientSupabaseLocal;
    }
    return null;
  }

  // === 1. INJEÇÃO DE ESTILOS CSS ===
  function injetarEstilosManutencao() {
    if (document.getElementById('manutencao-styles')) return;

    const style = document.createElement('style');
    style.id = 'manutencao-styles';
    style.innerHTML = `
      /* Tela Cheia Bloqueadora de Manutenção */
      .manutencao-overlay {
        position: fixed;
        inset: 0;
        background: #080409;
        background-image: 
          radial-gradient(circle at 50% 30%, rgba(255, 45, 85, 0.18) 0%, transparent 65%),
          radial-gradient(circle at 10% 90%, rgba(108, 92, 231, 0.12) 0%, transparent 55%);
        z-index: 9999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        color: #ffffff;
        text-align: center;
        animation: mFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes mFadeIn {
        from { opacity: 0; transform: scale(0.97); }
        to { opacity: 1; transform: scale(1); }
      }

      .manutencao-card {
        background: rgba(20, 11, 24, 0.96);
        border: 1px solid rgba(255, 45, 85, 0.38);
        padding: 42px 30px;
        border-radius: 28px;
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        box-shadow: 0 25px 70px rgba(0, 0, 0, 0.95), 0 0 35px rgba(255, 45, 85, 0.2);
        max-width: 490px;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 18px;
      }

      .manutencao-icon-box {
        width: 84px;
        height: 84px;
        border-radius: 50%;
        background: rgba(255, 45, 85, 0.12);
        border: 2px solid #ff2d55;
        color: #ff2d55;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.3rem;
        box-shadow: 0 0 30px rgba(255, 45, 85, 0.35);
        animation: pulseWrench 2.2s infinite ease-in-out;
      }

      @keyframes pulseWrench {
        0%, 100% { transform: scale(1); box-shadow: 0 0 25px rgba(255, 45, 85, 0.3); }
        50% { transform: scale(1.06); box-shadow: 0 0 45px rgba(255, 45, 85, 0.65); }
      }

      .manutencao-card h2 {
        font-size: 1.65rem;
        font-weight: 900;
        color: #ffffff;
        letter-spacing: -0.3px;
      }

      .manutencao-card p {
        color: #b3a5b8;
        font-size: 0.92rem;
        line-height: 1.6;
      }

      .manutencao-badge {
        background: rgba(255, 215, 0, 0.12);
        border: 1px dashed rgba(255, 215, 0, 0.45);
        color: #ffd700;
        font-size: 0.82rem;
        padding: 9px 16px;
        border-radius: 14px;
        font-weight: 800;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      /* Banner Flutuante de Aviso para Pessoas Autorizadas (Criador / Staff) */
      .manutencao-staff-banner {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 999999;
        background: rgba(20, 10, 24, 0.92);
        border: 1px solid #ffd700;
        color: #ffffff;
        padding: 10px 18px;
        border-radius: 30px;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 0.8rem;
        font-weight: 800;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 15px rgba(255, 215, 0, 0.25);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        animation: bannerSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes bannerSlideIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .manutencao-staff-banner i {
        color: #ffd700;
        font-size: 0.95rem;
      }

      .manutencao-staff-banner .btn-fechar-banner {
        background: rgba(255, 255, 255, 0.12);
        border: none;
        color: #ffffff;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        margin-left: 4px;
        transition: background 0.2s;
      }

      .manutencao-staff-banner .btn-fechar-banner:hover {
        background: rgba(255, 56, 56, 0.8);
      }

      @media (max-width: 600px) {
        .manutencao-staff-banner {
          top: 10px;
          left: 10px;
          right: 10px;
          justify-content: space-between;
          border-radius: 16px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // === 2. VERIFICAÇÃO DE PERMISSÕES DO USUÁRIO ===
  function obterDadosUsuarioLocal() {
    try {
      const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  async function eUsuarioAutorizadoNaManutencao() {
    const userLocal = obterDadosUsuarioLocal();
    if (!userLocal || !userLocal.id) return false;

    // Checagem local imediata
    const eCriadorLocal = Boolean(userLocal.is_creator || userLocal.is_criador);
    const eStaffLocal = userLocal.role === 'mod' || userLocal.role === 'admin' || Boolean(userLocal.is_admin) || Boolean(userLocal.is_mod);
    
    if (eCriadorLocal || eStaffLocal) return true;

    // Consulta de garantia no Supabase
    try {
      const client = obterSupabaseManutencao();
      if (client) {
        const { data: userBD } = await client
          .from('usuarios')
          .select('is_creator, is_criador, role, is_admin, is_mod')
          .eq('id', userLocal.id)
          .single();

        if (userBD) {
          const eCriadorBD = Boolean(userBD.is_creator || userBD.is_criador);
          const eStaffBD = userBD.role === 'mod' || userBD.role === 'admin' || Boolean(userBD.is_admin) || Boolean(userBD.is_mod);
          return eCriadorBD || eStaffBD;
        }
      }
    } catch (e) {}

    return false;
  }

  // === 3. CONTROLE DE INTERFACE ===
  function exibirTelaManutencao() {
    injetarEstilosManutencao();
    removerBannerStaff(); // Garante que não duplica o banner

    if (document.getElementById('manutencao-screen-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'manutencao-screen-overlay';
    overlay.className = 'manutencao-overlay';
    overlay.innerHTML = `
      <div class="manutencao-card">
        <div class="manutencao-icon-box">
          <i class="fa-solid fa-screwdriver-wrench"></i>
        </div>
        <h2>Servidor em Manutenção</h2>
        <p>Estamos realizando melhorias na infraestrutura e atualizações de segurança. A aplicação retornará em instantes.</p>
        <div class="manutencao-badge">
          <i class="fa-solid fa-clock"></i> Atualizações ao vivo em andamento
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
  }

  function removerTelaManutencao() {
    const el = document.getElementById('manutencao-screen-overlay');
    if (el) {
      el.remove();
      document.body.style.overflow = '';
    }
  }

  function exibirBannerAvisoStaff() {
    injetarEstilosManutencao();
    removerTelaManutencao();

    if (document.getElementById('manutencao-staff-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'manutencao-staff-banner';
    banner.className = 'manutencao-staff-banner';
    banner.innerHTML = `
      <span><i class="fa-solid fa-triangle-exclamation"></i> <strong>Modo Manutenção Ativo</strong> (Acesso Autorizado)</span>
      <button class="btn-fechar-banner" onclick="this.parentElement.remove()" title="Fechar aviso"><i class="fa-solid fa-xmark"></i></button>
    `;

    document.body.appendChild(banner);
  }

  function removerBannerStaff() {
    const banner = document.getElementById('manutencao-staff-banner');
    if (banner) banner.remove();
  }

  // === 4. PROCESSAMENTO DO ESTADO DA MANUTENÇÃO ===
  async function aplicarEstadoManutencao(emManutencao) {
    emManutencaoEstado = emManutencao;

    if (!emManutencao) {
      removerTelaManutencao();
      removerBannerStaff();
      return;
    }

    const autorizado = await eUsuarioAutorizadoNaManutencao();

    if (autorizado) {
      exibirBannerAvisoStaff();
    } else {
      exibirTelaManutencao();
    }
  }

  async function checarManutencaoGlobal() {
    // 1. Checagem rápida local no localStorage
    const localDesligado = localStorage.getItem('app_servidor_desligado') === 'true';
    
    // 2. Checagem remota no banco de dados Supabase
    try {
      const client = obterSupabaseManutencao();
      if (client) {
        const { data } = await client
          .from('configuracoes_sistema')
          .select('valor')
          .eq('chave', 'modo_manutencao')
          .single();

        if (data) {
          const emManutencaoBD = (data.valor === 'true' || data.valor === true);
          await aplicarEstadoManutencao(emManutencaoBD);
          ativarInscricaoRealtime();
          return;
        }
      }
    } catch (e) {}

    await aplicarEstadoManutencao(localDesligado);
  }

  // === 5. ESCUTA EM TEMPO REAL (SUPABASE REALTIME) ===
  function ativarInscricaoRealtime() {
    const client = obterSupabaseManutencao();
    if (!client || canalRealtime) return;

    canalRealtime = client
      .channel('manutencao-realtime-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes_sistema' }, payload => {
        if (payload.new && payload.new.chave === 'modo_manutencao') {
          const novoEstado = (payload.new.valor === 'true' || payload.new.valor === true);
          aplicarEstadoManutencao(novoEstado);
        }
      })
      .subscribe();
  }

  // Inicialização
  document.addEventListener('DOMContentLoaded', checarManutencaoGlobal);
  setInterval(checarManutencaoGlobal, 12000); // Polling de contingência a cada 12 segundos
})();
