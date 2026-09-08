// ==========================================================================
// MÓDULO DE NOTIFICAÇÕES EXTERNAS & IN-APP (notificacoes.js) - SPHERE v5.2 PRO
// In-App Floating Toast with Swipe-to-Dismiss, Web Push & CDC Realtime
// ==========================================================================

(function (global) {
  'use strict';

  const STORAGE_KEY_PERMISSAO = 'sphere_notificacoes_respondido';
  let canalRealtimeNotificacoes = null;

  function obterSupabase() {
    return global.supabaseClient || global.supabase || global.sb || null;
  }

  function obterUsuarioLocal() {
    try {
      const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function acionarVibracao(ms = 20) {
    if (typeof window !== 'undefined' && window.navigator && typeof window.navigator.vibrate === 'function') {
      try { window.navigator.vibrate(ms); } catch (e) {}
    }
  }

  // Injeção dos Estilos do Balão In-App
  (function injetarCssNotificacoes() {
    if (document.getElementById('notificacoes-css')) return;
    const style = document.createElement('style');
    style.id = 'notificacoes-css';
    style.textContent = `
      .sphere-inapp-toast-container {
        position: fixed;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        max-width: 420px;
        z-index: 10000;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .sphere-inapp-toast {
        pointer-events: auto;
        background: rgba(14, 7, 18, 0.94);
        border: 1px solid rgba(255, 45, 85, 0.4);
        border-radius: 18px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 12px 35px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 45, 85, 0.2);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        cursor: pointer;
        user-select: none;
        touch-action: pan-y;
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
        will-change: transform, opacity;
        animation: slideDownToast 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes slideDownToast {
        from { opacity: 0; transform: translateY(-30px) scale(0.92); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      .sphere-inapp-toast.swiping {
        transition: none !important;
      }

      .sphere-inapp-toast-avatar {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid var(--chat-accent, #ff2d55);
        flex-shrink: 0;
      }

      .sphere-inapp-toast-body {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .sphere-inapp-toast-title {
        font-size: 0.88rem;
        font-weight: 800;
        color: #ffffff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .sphere-inapp-toast-text {
        font-size: 0.78rem;
        color: #cbbccf;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .sphere-inapp-toast-close {
        background: transparent;
        border: none;
        color: #8e7f96;
        font-size: 0.9rem;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s ease;
      }

      .sphere-inapp-toast-close:hover {
        color: #ff2d55;
      }
    `;
    document.head.appendChild(style);
  })();

  // Container Único dos Toasts
  function obterContainerToast() {
    let container = document.getElementById('sphere-inapp-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'sphere-inapp-toast-container';
      container.className = 'sphere-inapp-toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  // 1. EXIBIÇÃO DE BALÃO IN-APP COM ARRASTE (SWIPE TO DISMISS)
  function exibirToastInApp(titulo, mensagem, avatarUrl = '/icon-192.png', aoClicar = null) {
    const container = obterContainerToast();
    acionarVibracao(25);

    const toast = document.createElement('div');
    toast.className = 'sphere-inapp-toast';

    const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(titulo)}`;
    const srcAvatar = avatarUrl && avatarUrl.trim() !== '' ? avatarUrl : defaultAvatar;

    toast.innerHTML = `
      <img src="${srcAvatar}" class="sphere-inapp-toast-avatar" onerror="this.onerror=null; this.src='${defaultAvatar}';" alt="Avatar">
      <div class="sphere-inapp-toast-body">
        <span class="sphere-inapp-toast-title">${titulo}</span>
        <span class="sphere-inapp-toast-text">${mensagem}</span>
      </div>
      <button class="sphere-inapp-toast-close" title="Fechar"><i class="fa-solid fa-xmark"></i></button>
    `;

    container.appendChild(toast);

    // Auto Fechamento em 5 Segundos
    let autoTimer = setTimeout(() => removerToast(toast), 5200);

    function removerToast(el) {
      if (!el || !el.parentNode) return;
      el.style.opacity = '0';
      el.style.transform = 'translateY(-20px) scale(0.9)';
      setTimeout(() => el.remove(), 250);
    }

    // Clique na Notificação
    toast.onclick = (e) => {
      if (e.target.closest('.sphere-inapp-toast-close')) {
        e.stopPropagation();
        clearTimeout(autoTimer);
        removerToast(toast);
        return;
      }
      clearTimeout(autoTimer);
      removerToast(toast);
      if (typeof aoClicar === 'function') aoClicar();
    };

    // Lógica de Arraste para os Lados (Swipe Gestures)
    let startX = 0;
    let currentX = 0;
    let isSwiping = false;

    toast.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      currentX = startX;
      isSwiping = true;
      toast.classList.add('swiping');
      clearTimeout(autoTimer);
    }, { passive: true });

    toast.addEventListener('touchmove', (e) => {
      if (!isSwiping) return;
      currentX = e.touches[0].clientX;
      const diffX = currentX - startX;
      toast.style.transform = `translateX(${diffX}px)`;
      toast.style.opacity = `${1 - Math.abs(diffX) / 250}`;
    }, { passive: true });

    toast.addEventListener('touchend', () => {
      if (!isSwiping) return;
      isSwiping = false;
      toast.classList.remove('swiping');
      const diffX = currentX - startX;

      if (Math.abs(diffX) > 80) {
        acionarVibracao(15);
        toast.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
        toast.style.transform = `translateX(${diffX > 0 ? 300 : -300}px)`;
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 200);
      } else {
        toast.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
        toast.style.transform = 'translateX(0px)';
        toast.style.opacity = '1';
        autoTimer = setTimeout(() => removerToast(toast), 4000);
      }
    });
  }

  // 2. REGISTRO DO SERVICE WORKER E DISPARO SISTÊMICO
  async function registrarServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (err) {
        console.warn('[Notificações] Falha ao registrar Service Worker:', err);
      }
    }
  }

  async function enviarNotificacaoExterna(titulo, corpo, icone = '/icon-192.png', url = '/', callbackLocal = null) {
    // 1. Se a aplicação estiver visível/aberta na tela, prioriza o balão In-App
    if (document.visibilityState === 'visible') {
      exibirToastInApp(titulo, corpo, icone, () => {
        if (typeof callbackLocal === 'function') {
          callbackLocal();
        } else if (url && url !== '/') {
          window.location.href = url;
        }
      });
      return;
    }

    // 2. Se a aplicação estiver em segundo plano ou fechada, envia para o SO
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(titulo, {
          body: corpo,
          icon: icone,
          badge: '/icon-192.png',
          vibrate: [100, 50, 100],
          data: { url: url }
        });
      } else {
        new Notification(titulo, { body: corpo, icon: icone });
      }
    } catch (e) {
      console.error('[Notificações] Erro ao disparar notificação externa:', e);
    }
  }

  // 3. MODAL INTERATIVO DE PERMISSÃO
  function criarEExibirModalNotificacao() {
    if (localStorage.getItem(STORAGE_KEY_PERMISSAO)) return;
    if (!('Notification' in window) || Notification.permission === 'granted') {
      localStorage.setItem(STORAGE_KEY_PERMISSAO, 'true');
      return;
    }

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'modal-permissao-notificacao';
    modalOverlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(6, 2, 8, 0.85);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      z-index: 10000; display: flex; align-items: center; justify-content: center;
      padding: 18px; animation: fadeInNotif 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    modalOverlay.innerHTML = `
      <style>
        @keyframes fadeInNotif { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .notif-card {
          background: rgba(14, 7, 18, 0.95); border: 1px solid rgba(255, 45, 85, 0.3);
          border-radius: 24px; padding: 28px; max-width: 420px; width: 100%;
          text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.8), 0 0 25px rgba(255, 45, 85, 0.2);
        }
        .notif-icon {
          width: 60px; height: 60px; border-radius: 50%; background: rgba(255, 45, 85, 0.12);
          color: #ff2d55; display: flex; align-items: center; justify-content: center;
          font-size: 1.8rem; margin: 0 auto 16px auto; border: 1px solid rgba(255, 45, 85, 0.3);
        }
        .notif-card h3 { color: #fff; font-size: 1.15rem; font-weight: 800; margin-bottom: 8px; }
        .notif-card p { color: #b8a8c0; font-size: 0.88rem; line-height: 1.5; margin-bottom: 22px; }
        .notif-btns { display: flex; gap: 10px; }
        .btn-notif-sim {
          flex: 1; height: 42px; background: linear-gradient(135deg, #ff2d55, #7000ff);
          color: #fff; border: none; border-radius: 12px; font-weight: 800; cursor: pointer;
        }
        .btn-notif-nao {
          flex: 1; height: 42px; background: rgba(255,255,255,0.08);
          color: #b8a8c0; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; font-weight: 800; cursor: pointer;
        }
      </style>
      <div class="notif-card">
        <div class="notif-icon"><i class="fa-solid fa-bell"></i></div>
        <h3>Ativar Notificações</h3>
        <p>Quer ativar as notificações para acompanhar mensagens, pedidos de amizade e mais?</p>
        <div class="notif-btns">
          <button class="btn-notif-sim" id="btn-notif-aceitar">Sim</button>
          <button class="btn-notif-nao" id="btn-notif-recusar">Não</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    document.getElementById('btn-notif-aceitar').onclick = async () => {
      localStorage.setItem(STORAGE_KEY_PERMISSAO, 'true');
      modalOverlay.remove();
      await solicitarPermissaoManual();
    };

    document.getElementById('btn-notif-recusar').onclick = () => {
      localStorage.setItem(STORAGE_KEY_PERMISSAO, 'true');
      modalOverlay.remove();
      if (typeof global.mostrarToast === 'function') {
        global.mostrarToast("Tudo bem, caso queira ativar a notificações, estará em configurações, tenha ótimo dia. <3");
      } else {
        alert("Tudo bem, caso queira ativar a notificações, estará em configurações, tenha ótimo dia. <3");
      }
    };
  }

  async function solicitarPermissaoManual() {
    if (!('Notification' in window)) return false;
    const permissao = await Notification.requestPermission();
    if (permissao === 'granted') {
      await registrarServiceWorker();
      enviarNotificacaoExterna('Sphere', 'Notificações ativadas com sucesso!');
      return true;
    }
    return false;
  }

  // 4. ESCUTA EM TEMPO REAL (REALTIME CDC) COM BUSCA DE AVATAR
  function escutarEventosNotificacao() {
    const user = obterUsuarioLocal();
    const sb = obterSupabase();
    if (!user || !user.id || !sb) return;

    if (canalRealtimeNotificacoes) {
      sb.removeChannel(canalRealtimeNotificacoes);
    }

    canalRealtimeNotificacoes = sb
      .channel(`notificacoes_user_${user.id}`)
      // Mensagens Diretas Recebidas
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `destinatario_id=eq.${user.id}` }, async payload => {
        const msg = payload.new;
        
        // Se já estiver com o chat do remetente aberto na tela, não exibe o toast
        if (global.chatTargetAtual && Number(global.chatTargetAtual.id) === Number(msg.remetente_id)) return;

        let remetenteNome = 'Mensagem Direta';
        let remetenteAvatar = '/icon-192.png';

        try {
          const { data: remetente } = await sb.from('usuarios').select('display_name, username, avatar_url').eq('id', msg.remetente_id).single();
          if (remetente) {
            remetenteNome = remetente.display_name || remetente.username || 'Mensagem Direta';
            remetenteAvatar = remetente.avatar_url || remetenteAvatar;
          }
        } catch (e) {}

        enviarNotificacaoExterna(
          remetenteNome,
          msg.conteudo || 'Enviou um anexo...',
          remetenteAvatar,
          '/#chat',
          () => {
            if (typeof global.seleccionarConversaDirect === 'function') {
              global.seleccionarConversaDirect(msg.remetente_id);
            }
          }
        );
      })
      // Amizades / Solicitações / Seguidores / Chat Solicitado
      .on('postgres_changes', { event: '*', schema: 'public', table: 'amizades', filter: `usuario_id_2=eq.${user.id}` }, async payload => {
        const { eventType, new: dadosNovos } = payload;

        let atorNome = 'Sphere';
        let atorAvatar = '/icon-192.png';

        if (dadosNovos && dadosNovos.usuario_id_1) {
          try {
            const { data: ator } = await sb.from('usuarios').select('display_name, username, avatar_url').eq('id', dadosNovos.usuario_id_1).single();
            if (ator) {
              atorNome = ator.display_name || ator.username || 'Sphere';
              atorAvatar = ator.avatar_url || atorAvatar;
            }
          } catch (e) {}
        }

        if (eventType === 'INSERT') {
          if (dadosNovos.tipo === 'solicitacao_chat') {
            enviarNotificacaoExterna(atorNome, 'Solicitou iniciar uma conversa com você!', atorAvatar);
          } else if (dadosNovos.tipo === 'seguidor') {
            enviarNotificacaoExterna(atorNome, 'Começou a seguir o seu perfil!', atorAvatar);
          } else {
            enviarNotificacaoExterna(atorNome, 'Enviou uma solicitação de amizade!', atorAvatar);
          }
        } else if (eventType === 'UPDATE') {
          if (dadosNovos.status === 'aceito') {
            enviarNotificacaoExterna(atorNome, 'Aceitou a sua solicitação de amizade!', atorAvatar);
          } else if (dadosNovos.status === 'recusado') {
            enviarNotificacaoExterna(atorNome, 'Recusou a solicitação de amizade.', atorAvatar);
          }
        }
      })
      .subscribe();
  }

  // INICIALIZAÇÃO AUTOMÁTICA
  document.addEventListener('DOMContentLoaded', () => {
    registrarServiceWorker();
    
    setTimeout(() => {
      criarEExibirModalNotificacao();
      escutarEventosNotificacao();
    }, 1200);
  });

  // EXPORTAÇÕES GLOBAIS
  global.solicitarPermissaoManual = solicitarPermissaoManual;
  global.enviarNotificacaoExterna = enviarNotificacaoExterna;
  global.exibirToastInApp = exibirToastInApp;

})(typeof window !== 'undefined' ? window : this);
