// ==========================================================================
// NAVIGATION & LAYOUT COMPONENTS (components.js) - PROJECT Z ENHANCED
// ==========================================================================

// Mapeamento Centralizado das Abas
const INFOS_NAVEGACAO = {
  home: { titulo: "Início", icone: "fa-solid fa-house" },
  chat: { titulo: "Salas de Chat / RP", icone: "fa-solid fa-comments" },
  perfil: { titulo: "Meu Perfil", icone: "fa-solid fa-user-gear" },
  mod: { titulo: "Central de Moderação", icone: "fa-solid fa-shield-halved", link: "dev.html" },
  server: { titulo: "Painel do Servidor", icone: "fa-solid fa-server", link: "servidor.html" },
  config: { titulo: "Configurações", icone: "fa-solid fa-gear" }
};

let abaAtivaAtual = 'home';

// Auxiliar seguro para obter o usuário do localStorage
function obterUsuarioLogadoLocal() {
  try {
    const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('[Components] Erro ao parsear usuário logado:', e);
  }
  return null;
}

// Verifica se o usuário está na tela de autenticação (Login / Cadastro)
function estaEmTelaAuth() {
  const authCard = document.getElementById('auth-card');
  const usuarioLogado = obterUsuarioLogadoLocal();
  
  if (!usuarioLogado) return true;
  if (authCard && !authCard.classList.contains('hidden')) return true;
  
  return false;
}

// 1. Renderização da Top Bar (Barra Superior)
function renderTopBar(abaInicial = "home") {
  if (estaEmTelaAuth()) return;
  if (document.getElementById('app-top-bar')) return;

  const info = INFOS_NAVEGACAO[abaInicial] || INFOS_NAVEGACAO.home;

  const topBar = document.createElement('header');
  topBar.id = 'app-top-bar';
  topBar.className = 'app-top-bar';
  topBar.innerHTML = `
    <div class="brand">
      <i id="top-bar-icon" class="${info.icone}"></i>
      <span id="top-bar-title">${info.titulo}</span>
    </div>
    <div class="top-actions">
      <button class="top-action-btn btn-teste-top" id="btn-top-teste" title="Ação Teste" onclick="executarAcaoTeste();">
        <i class="fa-solid fa-vial"></i> <span>Teste</span>
      </button>
    </div>
  `;

  document.body.appendChild(topBar);
  document.body.classList.add('has-bars');
}

// Função de Teste da Barra Superior
function executarAcaoTeste() {
  if (typeof window.mostrarToastPerfil === 'function') {
    window.mostrarToastPerfil('Recurso de Teste Acionado!', 'info');
  } else {
    alert('🧪 Ação de teste disparada com sucesso!');
  }
}

// 2. Renderização da Bottom Bar Condicional (Pílula)
function renderBottomBar() {
  if (estaEmTelaAuth()) return;
  if (document.getElementById('app-bottom-bar')) return;

  const user = obterUsuarioLogadoLocal();
  const eCriador = Boolean(user && user.is_creator);
  // Apenas cargos de staff (mod/admin) e NÃO apenas 'verificados'
  const eStaff = Boolean(user && (user.role === 'mod' || user.role === 'admin' || eCriador));

  const bottomBar = document.createElement('nav');
  bottomBar.id = 'app-bottom-bar';
  bottomBar.className = 'app-bottom-bar';
  
  // Monta os itens dinamicamente
  let htmlItens = `
    <a href="#" class="bottom-nav-item active" data-aba="home" onclick="event.preventDefault(); alternarAbaNav('home', this);">
      <i class="fa-solid fa-house"></i>
      <span>Home</span>
    </a>
    <a href="#" class="bottom-nav-item" data-aba="chat" onclick="event.preventDefault(); alternarAbaNav('chat', this);">
      <i class="fa-solid fa-comments"></i>
      <span>Chat</span>
    </a>
    <a href="#" class="bottom-nav-item" data-aba="perfil" onclick="event.preventDefault(); alternarAbaNav('perfil', this);">
      <i class="fa-solid fa-user-gear"></i>
      <span>Perfil</span>
    </a>
  `;

  // Item de Moderação (Apenas para Staff)
  if (eStaff) {
    htmlItens += `
      <a href="dev.html" class="bottom-nav-item item-staff" data-aba="mod" title="Moderação">
        <i class="fa-solid fa-shield-halved"></i>
        <span>Mod</span>
      </a>
    `;
  }

  // Item de Servidor (Apenas para o Criador)
  if (eCriador) {
    htmlItens += `
      <a href="servidor.html" class="bottom-nav-item item-creator" data-aba="server" title="Servidor">
        <i class="fa-solid fa-server"></i>
        <span>Server</span>
      </a>
    `;
  }

  // Item de Configurações
  htmlItens += `
    <a href="#" class="bottom-nav-item" data-aba="config" onclick="event.preventDefault(); alternarAbaNav('config', this);">
      <i class="fa-solid fa-gear"></i>
      <span>Ajustes</span>
    </a>
  `;

  bottomBar.innerHTML = `<div class="bottom-bar-pill">${htmlItens}</div>`;

  document.body.appendChild(bottomBar);
  document.body.classList.add('has-bars');
}

// Controle de Exibição Dinâmica da Barra Inferior
function alternarVisibilidadeBottomBar(visivel) {
  const bottomBar = document.getElementById('app-bottom-bar');
  if (!bottomBar) return;

  if (visivel && !estaEmTelaAuth()) {
    bottomBar.style.display = 'flex';
  } else {
    bottomBar.style.display = 'none';
  }
}

// 3. Limpeza de Modais e Telas Sobrepostas
function fecharModaisEViewsAbertas() {
  if (typeof window.fecharPerfil === 'function') window.fecharPerfil();
  if (typeof window.fecharViewPerfil === 'function') window.fecharViewPerfil();
  if (typeof window.fecharModalEditarPerfil === 'function') window.fecharModalEditarPerfil();
  if (typeof window.fecharInterfaceChat === 'function') window.fecharInterfaceChat();
  if (typeof window.fecharConfiguracoesSilencioso === 'function') window.fecharConfiguracoesSilencioso();
  if (typeof window.fecharPainelConfig === 'function') window.fecharPainelConfig();
  if (typeof window.fecharListaSocial === 'function') window.fecharListaSocial();

  document.querySelectorAll('.chat-media-full-modal').forEach(m => m.remove());

  const viewConfig = document.getElementById('configuracoes-view');
  if (viewConfig) {
    viewConfig.classList.add('hidden');
  }
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

// 4. Alternância de Abas
function alternarAbaNav(aba, elementoNav) {
  if (!INFOS_NAVEGACAO[aba]) return;

  // Redirecionamento direto para páginas externas (Mod / Servidor)
  if (INFOS_NAVEGACAO[aba].link) {
    window.location.href = INFOS_NAVEGACAO[aba].link;
    return;
  }

  abaAtivaAtual = aba;

  // Atualiza item ativo na Bottom Bar
  document.querySelectorAll('.bottom-nav-item').forEach(item => item.classList.remove('active'));

  const btnAlvo = elementoNav || document.querySelector(`.bottom-nav-item[data-aba="${aba}"]`);
  if (btnAlvo) btnAlvo.classList.add('active');

  alternarVisibilidadeBottomBar(true);

  // Controle dinâmico da TopBar (oculta no chat se necessário)
  const topBar = document.getElementById('app-top-bar');
  if (topBar) {
    if (aba === 'chat') {
      topBar.style.display = 'none';
      document.body.classList.add('chat-fullscreen');
    } else {
      topBar.style.display = 'flex';
      document.body.classList.remove('chat-fullscreen');
      
      const info = INFOS_NAVEGACAO[aba];
      const topTitle = document.getElementById('top-bar-title');
      const topIcon = document.getElementById('top-bar-icon');

      if (topTitle) topTitle.textContent = info.titulo;
      if (topIcon) topIcon.className = info.icone;
    }
  }

  fecharModaisEViewsAbertas();

  // Esconde/Exibe telas principais
  const homeScreen = document.getElementById('home-screen');
  if (homeScreen) {
    if (aba === 'home') {
      homeScreen.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      homeScreen.classList.add('hidden');
    }
  }

  // Sincronização do HomeCard
  if (aba === 'home') {
    if (typeof window.exibirHomeCard === 'function') window.exibirHomeCard();
  } else {
    if (typeof window.ocultarHomeCard === 'function') window.ocultarHomeCard();
  }

  // Execução dos módulos por aba
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

// 5. Sincroniza e Esconde as Barras em Telas de Autenticação (Auth)
function atualizarComponentesVisiveis() {
  const topBar = document.getElementById('app-top-bar');
  const bottomBar = document.getElementById('app-bottom-bar');

  if (!estaEmTelaAuth()) {
    if (!topBar) renderTopBar(abaAtivaAtual);
    if (!bottomBar) renderBottomBar();
  } else {
    if (topBar) topBar.remove();
    if (bottomBar) bottomBar.remove();
    document.body.classList.remove('has-bars', 'chat-fullscreen');
  }
}

// 6. Notificações do Chat
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

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  atualizarComponentesVisiveis();
});

// Exportações Globais
window.renderTopBar = renderTopBar;
window.renderBottomBar = renderBottomBar;
window.alternarAbaNav = alternarAbaNav;
window.alternarVisibilidadeBottomBar = alternarVisibilidadeBottomBar;
window.atualizarComponentesVisiveis = atualizarComponentesVisiveis;
window.atualizarBadgeNotificacaoChat = atualizarBadgeNotificacaoChat;
window.fecharModaisEViewsAbertas = fecharModaisEViewsAbertas;
window.executarAcaoTeste = executarAcaoTeste;
