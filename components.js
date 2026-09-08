// ==========================================================================
// NAVIGATION & LAYOUT COMPONENTS (components.js) - SPHERE SYSTEM
// Sphere v5.2 | Dynamic Theme Sync, Avatar Profile Nav & Layout Orchestrator
// ==========================================================================

(function (global) {
  'use strict';

  // Mapeamento Centralizado das Abas do Sphere
  const INFOS_NAVEGACAO = {
    home: { titulo: "Sphere - Início", icone: "fa-solid fa-house" },
    chat: { titulo: "Sphere - Mensagens", icone: "fa-solid fa-comments" },
    perfil: { titulo: "Sphere - Meu Perfil", icone: "fa-solid fa-user" },
    config: { titulo: "Sphere - Configurações", icone: "fa-solid fa-gear" }
  };

  let abaAtivaAtual = sessionStorage.getItem('sphere_aba_ativa') || 'home';

  function obterUsuarioLogadoLocal() {
    try {
      const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('[Sphere] Erro ao carregar usuário logado:', e);
    }
    return null;
  }

  function estaEmTelaAuth() {
    const authCard = document.getElementById('auth-card');
    const usuarioLogado = obterUsuarioLogadoLocal();
    
    if (!usuarioLogado) return true;
    if (authCard && !authCard.classList.contains('hidden') && authCard.style.display !== 'none') return true;
    
    return false;
  }

  /**
   * Aplica o tema visual configurado pelo usuário na Bottom Bar em tempo real.
   */
  function aplicarCoresTemaBarra() {
    const pill = document.querySelector('.bottom-bar-pill');
    if (!pill) return;

    const user = obterUsuarioLogadoLocal();
    const corBg1 = user?.cor_bg1 || user?.cor_tema || '#ff2d55';
    const corBg2 = user?.cor_bg2 || user?.cor_tema || '#ff7675';
    const corGradient = corBg1 !== corBg2 
      ? `linear-gradient(135deg, ${corBg1}, ${corBg2})` 
      : corBg1;

    pill.style.setProperty('--user-theme-color', corBg1);
    pill.style.setProperty('--user-theme-gradient', corGradient);
    pill.style.setProperty('--user-theme-glow', `${corBg1}50`);
    pill.style.setProperty('--user-theme-border', `${corBg1}45`);
  }

  /**
   * Sincroniza foto de perfil e moldura na barra de navegação.
   */
  function sincronizarAvatarEMolduraNav() {
    const imgAvatar = document.getElementById('nav-profile-avatar-img');
    const imgMoldura = document.getElementById('nav-profile-moldura-img');
    
    if (!imgAvatar) return;

    const user = obterUsuarioLogadoLocal();
    const usernameClean = user ? (user.username || user.nome || 'user') : 'user';
    const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(usernameClean)}`;
    const avatarUrl = user && user.avatar_url && user.avatar_url.trim() !== '' ? user.avatar_url : defaultAvatar;
    const molduraUrl = user && user.moldura_url && user.moldura_url.trim() !== '' ? user.moldura_url : null;

    imgAvatar.src = avatarUrl;

    if (imgMoldura) {
      if (molduraUrl) {
        imgMoldura.src = molduraUrl;
        imgMoldura.style.display = 'block';
      } else {
        imgMoldura.style.display = 'none';
        imgMoldura.src = '';
      }
    }

    aplicarCoresTemaBarra();
  }

  /**
   * Renderiza a Bottom Bar flutuante na página.
   */
  function renderBottomBar() {
    if (estaEmTelaAuth()) return;  
    
    const bottomBarExistente = document.getElementById('app-bottom-bar');
    if (bottomBarExistente) bottomBarExistente.remove();

    const user = obterUsuarioLogadoLocal();
    const usernameClean = user ? (user.username || user.nome || 'user') : 'user';
    const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(usernameClean)}`;
    const avatarUrl = user && user.avatar_url && user.avatar_url.trim() !== '' ? user.avatar_url : defaultAvatar;
    const molduraUrl = user && user.moldura_url && user.moldura_url.trim() !== '' ? user.moldura_url : null;

    const bottomBar = document.createElement('nav');
    bottomBar.id = 'app-bottom-bar';
    bottomBar.className = 'app-bottom-bar';
    
    const htmlItens = `
      <a href="#" class="bottom-nav-item ${abaAtivaAtual === 'home' ? 'active' : ''}" data-aba="home" onclick="event.preventDefault(); alternarAbaNav('home', this);">
        <i class="fa-solid fa-house"></i>
        <span>Home</span>
      </a>
      <a href="#" class="bottom-nav-item ${abaAtivaAtual === 'chat' ? 'active' : ''}" data-aba="chat" onclick="event.preventDefault(); alternarAbaNav('chat', this);">
        <i class="fa-solid fa-comments"></i>
        <span>Chat</span>
      </a>
      <a href="#" class="bottom-nav-item ${abaAtivaAtual === 'perfil' ? 'active' : ''}" data-aba="perfil" onclick="event.preventDefault(); alternarAbaNav('perfil', this);">
        <div class="nav-profile-avatar-wrap">
          <img id="nav-profile-avatar-img" src="${avatarUrl}" class="nav-profile-avatar" onerror="this.onerror=null; this.src='${defaultAvatar}';" alt="Perfil">
          <img id="nav-profile-moldura-img" src="${molduraUrl || ''}" class="nav-profile-moldura" style="${molduraUrl ? 'display:block;' : 'display:none;'}" alt="Moldura">
        </div>
        <span>Perfil</span>
      </a>
      <a href="#" class="bottom-nav-item ${abaAtivaAtual === 'config' ? 'active' : ''}" data-aba="config" onclick="event.preventDefault(); alternarAbaNav('config', this);">
        <i class="fa-solid fa-gear"></i>
        <span>Ajustes</span>
      </a>
    `;

    bottomBar.innerHTML = `<div class="bottom-bar-pill">${htmlItens}</div>`;
    document.body.appendChild(bottomBar);

    sincronizarEstadoBarraNoChat();
    aplicarCoresTemaBarra();
  }

  /**
   * Alterna a visibilidade da barra com animação fluida.
   */
  function alternarVisibilidadeBottomBar(visivel) {
    const bottomBar = document.getElementById('app-bottom-bar');
    if (!bottomBar) return;

    if (visivel && !estaEmTelaAuth()) {
      bottomBar.style.display = 'flex';
      requestAnimationFrame(() => {
        bottomBar.style.opacity = '1';
        bottomBar.style.transform = 'translateY(0)';
      });
    } else {
      bottomBar.style.opacity = '0';
      bottomBar.style.transform = 'translateY(22px)';
      setTimeout(() => {
        if (bottomBar && bottomBar.style.opacity === '0') {
          bottomBar.style.display = 'none';
        }
      }, 250);
    }
  }

  function atualizarTituloAbaSite(tituloPersonalizado) {
    if (tituloPersonalizado) {
      document.title = tituloPersonalizado;
    } else {
      const info = INFOS_NAVEGACAO[abaAtivaAtual] || INFOS_NAVEGACAO.home;
      document.title = info.titulo;
    }
  }

  function fecharModaisEViewsAbertas() {
    if (typeof window.fecharPerfil === 'function') window.fecharPerfil();
    if (typeof window.fecharViewPerfil === 'function') window.fecharViewPerfil();
    if (typeof window.fecharModalEditarPerfil === 'function') window.fecharModalEditarPerfil();
    if (typeof window.fecharInterfaceChat === 'function') window.fecharInterfaceChat();
    if (typeof window.fecharConfiguracoesSilencioso === 'function') window.fecharConfiguracoesSilencioso();
    if (typeof window.fecharPainelConfig === 'function') window.fecharPainelConfig();
    if (typeof window.fecharListaSocial === 'function') window.fecharListaSocial();

    document.querySelectorAll('.chat-media-full-modal, .perfil-modal-recado-overlay').forEach(m => m.remove());

    const viewConfig = document.getElementById('configuracoes-view');
    if (viewConfig) viewConfig.classList.add('hidden');
  }

  window.fecharConfiguracoesSilencioso = function() {
    const container = document.getElementById('configuracoes-view');
    if (container) {
      container.style.display = 'none';
      container.classList.add('hidden');
    }
  };

  window.fecharConfiguracoes = function() {
    window.fecharConfiguracoesSilencioso();
    alternarAbaNav('home');
  };

  function alternarAbaNav(aba, elementoNav) {
    if (!INFOS_NAVEGACAO[aba]) return;

    abaAtivaAtual = aba;
    sessionStorage.setItem('sphere_aba_ativa', aba);

    document.querySelectorAll('.bottom-nav-item').forEach(item => item.classList.remove('active'));
    const btnAlvo = elementoNav || document.querySelector(`.bottom-nav-item[data-aba="${aba}"]`);
    if (btnAlvo) btnAlvo.classList.add('active');

    fecharModaisEViewsAbertas();
    atualizarTituloAbaSite();

    const homeScreen = document.getElementById('home-screen');
    if (homeScreen) {
      if (aba === 'home') {
        homeScreen.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        homeScreen.classList.add('hidden');
      }
    }

    if (aba === 'home') {
      if (typeof window.exibirHomeCard === 'function') window.exibirHomeCard();
    } else {
      if (typeof window.ocultarHomeCard === 'function') window.ocultarHomeCard();
    }

    if (aba === 'chat') {
      if (window.chatTargetAtual) {
        alternarVisibilidadeBottomBar(false);
      } else {
        alternarVisibilidadeBottomBar(true);
      }
    } else {
      alternarVisibilidadeBottomBar(true);
    }

    switch (aba) {
      case 'chat':
        if (typeof window.abrirInterfaceChat === 'function') window.abrirInterfaceChat();
        else if (typeof window.abrirChat === 'function') window.abrirChat();
        break;

      case 'perfil':
        const usuarioLogado = obterUsuarioLogadoLocal();
        if (typeof window.abrirPerfil === 'function' && usuarioLogado) {
          window.abrirPerfil(usuarioLogado);
        }
        break;

      case 'config':
        if (typeof window.abrirConfiguracoes === 'function') window.abrirConfiguracoes();
        else if (typeof window.abrirPainelConfig === 'function') window.abrirPainelConfig();
        break;
    }

    aplicarCoresTemaBarra();
  }

  function sincronizarEstadoBarraNoChat() {
    if (abaAtivaAtual === 'chat') {
      if (window.chatTargetAtual) {
        alternarVisibilidadeBottomBar(false);
      } else {
        alternarVisibilidadeBottomBar(true);
      }
    }
  }

  function atualizarBadgeNotificacaoChat(contador) {
    const btnChat = document.querySelector(`.bottom-nav-item[data-aba="chat"]`);
    if (!btnChat) return;

    let badge = btnChat.querySelector('.top-action-badge');

    if (contador > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'top-action-badge';
        btnChat.appendChild(badge);
      }
      badge.textContent = contador > 99 ? '99+' : contador;
    } else if (badge) {
      badge.remove();
    }
  }

  function notificarAberturaPerfilUsuario(usuarioTarget) {
    if (!usuarioTarget) return;
    const username = usuarioTarget.username || usuarioTarget.nome || 'usuario';
    atualizarTituloAbaSite(`Sphere - Perfil de @${username}`);
  }

  function atualizarComponentesVisiveis() {
    const bottomBar = document.getElementById('app-bottom-bar');

    if (!estaEmTelaAuth()) {
      if (!bottomBar) renderBottomBar();
      sincronizarAvatarEMolduraNav();
      alternarAbaNav(abaAtivaAtual);
    } else {
      if (bottomBar) bottomBar.remove();
    }
  }

  // Escutadores de Eventos Globais de Atualização
  window.addEventListener('storage', (e) => {
    if (['usuario_logado', 'usuario', 'user'].includes(e.key)) {
      sincronizarAvatarEMolduraNav();
    }
  });

  window.addEventListener('usuario_atualizado', () => {
    sincronizarAvatarEMolduraNav();
  });

  window.addEventListener('perfil_salvo', () => {
    sincronizarAvatarEMolduraNav();
  });

  document.addEventListener('DOMContentLoaded', () => {
    atualizarComponentesVisiveis();
  });

  // Exportações Globais
  global.renderBottomBar = renderBottomBar;
  global.alternarAbaNav = alternarAbaNav;
  global.alternarVisibilidadeBottomBar = alternarVisibilidadeBottomBar;
  global.atualizarComponentesVisiveis = atualizarComponentesVisiveis;
  global.atualizarBadgeNotificacaoChat = atualizarBadgeNotificacaoChat;
  global.fecharModaisEViewsAbertas = fecharModaisEViewsAbertas;
  global.sincronizarEstadoBarraNoChat = sincronizarEstadoBarraNoChat;
  global.atualizarTituloAbaSite = atualizarTituloAbaSite;
  global.notificarAberturaPerfilUsuario = notificarAberturaPerfilUsuario;
  global.sincronizarAvatarEMolduraNav = sincronizarAvatarEMolduraNav;

})(typeof window !== 'undefined' ? window : this);
