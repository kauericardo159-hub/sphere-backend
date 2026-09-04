// ==========================================================================
// NAVIGATION & LAYOUT COMPONENTS (components.js) - SPHERE SYSTEM
// Sphere v5.2 | Dynamic Avatar Profile Nav, Realtime Avatar Sync & Layout Orchestrator
// ==========================================================================

// Mapeamento Centralizado das Abas do Sphere
const INFOS_NAVEGACAO = {
  home: { titulo: "Sphere - Início", icone: "fa-solid fa-house" },
  chat: { titulo: "Sphere - Mensagens", icone: "fa-solid fa-comments" },
  perfil: { titulo: "Sphere - Meu Perfil", icone: "fa-solid fa-user" },
  config: { titulo: "Sphere - Configurações", icone: "fa-solid fa-gear" }
};

// Persistência de Aba via sessionStorage
let abaAtivaAtual = sessionStorage.getItem('sphere_aba_ativa') || 'home';

// Auxiliar seguro para obter o usuário do localStorage
function obterUsuarioLogadoLocal() {
  try {
    const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('[Sphere] Erro ao carregar usuário logado:', e);
  }
  return null;
}

// Verifica se o usuário está na tela de autenticação
function estaEmTelaAuth() {
  const authCard = document.getElementById('auth-card');
  const usuarioLogado = obterUsuarioLogadoLocal();
  
  if (!usuarioLogado) return true;
  if (authCard && !authCard.classList.contains('hidden') && authCard.style.display !== 'none') return true;
  
  return false;
}

// Injeção de CSS para a Barra Flutuante e Mini Avatar do Perfil
(function injetarCssComponents() {
  if (document.getElementById('components-nav-css')) return;
  const style = document.createElement('style');
  style.id = 'components-nav-css';
  style.textContent = `
    .app-bottom-bar {
      position: fixed;
      bottom: 16px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1200;
      pointer-events: none;
      transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease;
    }

    .bottom-bar-pill {
      pointer-events: auto;
      background: rgba(18, 9, 22, 0.92);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      border: 1px solid rgba(255, 45, 85, 0.3);
      border-radius: 32px;
      padding: 6px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 10px 32px rgba(0, 0, 0, 0.88), 0 0 18px rgba(255, 45, 85, 0.18);
    }

    .bottom-nav-item {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      padding: 6px 14px;
      border-radius: 20px;
      color: #b3a5b8;
      text-decoration: none;
      font-size: 0.72rem;
      font-weight: 700;
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .bottom-nav-item i {
      font-size: 1.15rem;
      transition: transform 0.2s ease;
    }

    .bottom-nav-item:hover {
      color: #ffffff;
      transform: translateY(-2px);
    }

    .bottom-nav-item.active {
      color: #ffffff;
      background: linear-gradient(135deg, rgba(255, 45, 85, 0.9), rgba(216, 27, 67, 0.9));
      box-shadow: 0 4px 14px rgba(255, 45, 85, 0.4);
    }

    .bottom-nav-item.active i {
      transform: scale(1.1);
    }

    /* Container Mini Avatar + Moldura para Aba Perfil */
    .nav-profile-avatar-wrap {
      position: relative;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .nav-profile-avatar {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid rgba(255, 255, 255, 0.3);
      background: #140b17;
    }

    .nav-profile-moldura {
      position: absolute;
      top: -14%;
      left: -14%;
      width: 128%;
      height: 128%;
      pointer-events: none;
      object-fit: contain;
      z-index: 2;
    }

    /* Badges de Notificação */
    .top-action-badge {
      position: absolute;
      top: 2px;
      right: 8px;
      background: #ff2d55;
      color: #fff;
      font-size: 0.65rem;
      font-weight: 900;
      padding: 1px 5px;
      border-radius: 10px;
      border: 2px solid #120916;
      box-shadow: 0 0 10px rgba(255, 45, 85, 0.9);
      animation: popBadge 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    @keyframes popBadge {
      0% { transform: scale(0); }
      100% { transform: scale(1); }
    }

    @media (max-width: 480px) {
      .app-bottom-bar { bottom: 10px; }
      .bottom-bar-pill { padding: 4px 10px; gap: 6px; }
      .bottom-nav-item { padding: 6px 10px; font-size: 0.68rem; }
      .bottom-nav-item i { font-size: 1.05rem; }
    }
  `;
  document.head.appendChild(style);
})();

// SINCRONIZAÇÃO EM TEMPO REAL DO MINI AVATAR E MOLDURA DA NAV
function sincronizarAvatarEMolduraNav() {
  const imgAvatar = document.getElementById('nav-profile-avatar-img');
  const imgMoldura = document.getElementById('nav-profile-moldura-img');
  
  if (!imgAvatar) return;

  const user = obtainingUserLocalSafe();
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
}

function obtainingUserLocalSafe() {
  return obterUsuarioLogadoLocal();
}

// Renderização da Bottom Bar Flutuante
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
  
  let htmlItens = `
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
}

// Controle Inteligente de Visibilidade da Barra Inferior
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

// Ajuste Dinâmico do Título do Site na Aba do Navegador
function atualizarTituloAbaSite(tituloPersonalizado) {
  if (tituloPersonalizado) {
    document.title = tituloPersonalizado;
  } else {
    const info = INFOS_NAVEGACAO[abaAtivaAtual] || INFOS_NAVEGACAO.home;
    document.title = info.titulo;
  }
}

// Fechamento de Modais e Views
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

// Alternância de Abas e Persistência de Navegação
function alternarAbaNav(aba, elementoNav) {
  if (!INFOS_NAVEGACAO[aba]) return;

  abaAtivaAtual = aba;
  sessionStorage.setItem('sphere_aba_ativa', aba);

  document.querySelectorAll('.bottom-nav-item').forEach(item => item.classList.remove('active'));
  const btnAlvo = elementoNav || document.querySelector(`.bottom-nav-item[data-aba="${aba}"]`);
  if (btnAlvo) btnAlvo.classList.add('active');

  fecharModaisEViewsAbertas();
  atualizarTituloAbaSite();

  // Gerenciamento de Visibilidade do Home
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

  // Comportamento no Chat: Se nenhuma conversa estiver selecionada, a barra PERMANECE exibida
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
}

// Sincroniza a Barra Flutuante com o Estado da Conversa Aberta/Lista
function sincronizarEstadoBarraNoChat() {
  if (abaAtivaAtual === 'chat') {
    if (window.chatTargetAtual) {
      alternarVisibilidadeBottomBar(false);
    } else {
      alternarVisibilidadeBottomBar(true);
    }
  }
}

// Notificações e Badges de Mensagens Não Lidas no Chat
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

// Atualiza Título do Navegador ao Abrir Perfil de Terceiros
function notificarAberturaPerfilUsuario(usuarioTarget) {
  if (!usuarioTarget) return;
  const username = usuarioTarget.username || usuarioTarget.nome || 'usuario';
  atualizarTituloAbaSite(`Sphere - Perfil de @${username}`);
}

// Inicialização de Componentes
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

// Evento Listener para Sincronização em Tempo Real via Storage/Eventos
window.addEventListener('storage', (e) => {
  if (['usuario_logado', 'usuario', 'user'].includes(e.key)) {
    sincronizarAvatarEMolduraNav();
  }
});

// Listener Interno para Atualização Imediata no Mesmo Tab
window.addEventListener('usuario_atualizado', () => {
  sincronizarAvatarEMolduraNav();
});

// Evento DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  atualizarComponentesVisiveis();
});

// Exportações Globais
window.renderBottomBar = renderBottomBar;
window.alternarAbaNav = alternarAbaNav;
window.alternarVisibilidadeBottomBar = alternarVisibilidadeBottomBar;
window.atualizarComponentesVisiveis = atualizarComponentesVisiveis;
window.atualizarBadgeNotificacaoChat = atualizarBadgeNotificacaoChat;
window.fecharModaisEViewsAbertas = fecharModaisEViewsAbertas;
window.sincronizarEstadoBarraNoChat = sincronizarEstadoBarraNoChat;
window.atualizarTituloAbaSite = atualizarTituloAbaSite;
window.notificarAberturaPerfilUsuario = notificarAberturaPerfilUsuario;
window.sincronizarAvatarEMolduraNav = sincronizarAvatarEMolduraNav;
