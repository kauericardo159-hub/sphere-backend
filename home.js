// ==========================================================================
// MÓDULO HOME & GERENCIADOR DE TELA (home.js) - SPHERE PRO v5.2
// Project Z / Sphere | Integração HomeCard, Session Storage & Encerramento Seguro
// ==========================================================================

function carregarHome(usuario) {
  if (!usuario) {
    console.warn("[Home] Tentativa de carregar Home sem usuário válido.");
    return;
  }

  // 1. Sincroniza a sessão local de forma segura
  try {
    localStorage.setItem('usuario_logado', JSON.stringify(usuario));
  } catch (e) {
    console.error("[Home] Erro ao salvar sessão no localStorage:", e);
  }

  // 2. Transição visual entre Auth e Aplicação Principal
  const authCard = document.getElementById('auth-card');
  const homeScreen = document.getElementById('home-screen');

  if (authCard) authCard.classList.add('hidden');
  if (homeScreen) homeScreen.classList.remove('hidden');

  // 3. Renderização do HomeCard (Card do Perfil, Lista de Membros e Interações)
  if (typeof window.renderHomeCard === 'function') {
    try {
      window.renderHomeCard(usuario);
    } catch (e) {
      console.error("[Home] Erro ao executar renderHomeCard:", e);
    }
  }

  // 4. Atualiza demais componentes reativos Globais
  if (typeof window.atualizarComponentesVisiveis === 'function') {
    try {
      window.atualizarComponentesVisiveis();
    } catch (e) {
      console.error("[Home] Erro ao atualizar componentes visíveis:", e);
    }
  }
}

async function sair() {
  // 1. Atualiza e força a sincronização do status para Offline
  if (typeof window.atualizarStatusServidor === 'function') {
    try {
      await window.atualizarStatusServidor('offline', true);
    } catch (e) {
      console.warn("[Home] Falha ao atualizar status para offline ao sair:", e);
    }
  } else if (typeof window.atualizarStatusLocal === 'function') {
    try {
      window.atualizarStatusLocal('offline');
    } catch (e) {
      console.warn("[Home] Falha ao atualizar status local ao sair:", e);
    }
  }

  // 2. Desconecta o HomeCard e encerra Realtime Listeners
  if (typeof window.removerHomeCard === 'function') {
    try {
      window.removerHomeCard();
    } catch (e) {
      console.warn("[Home] Falha ao remover HomeCard:", e);
    }
  }

  // 3. Limpa o armazenamento local de sessão
  try {
    localStorage.removeItem('usuario_logado');
    localStorage.removeItem('usuario');
    localStorage.removeItem('user');
    sessionStorage.clear();
  } catch (e) {
    console.error("[Home] Erro ao limpar credenciais salvas:", e);
  }

  // 4. Recarrega a aplicação de forma limpa
  window.location.reload();
}

// Exportações Globais
window.carregarHome = carregarHome;
window.sair = sair;
