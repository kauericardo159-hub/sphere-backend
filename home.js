// ==========================================================================
// MÓDULO HOME & GERENCIADOR DE TELA (home.js)
// Project Z v5.0 | Integração Nativa HomeCard, Presence Offline Sync & UI
// ==========================================================================

function carregarHome(usuario) {
  if (!usuario) return;

  // Sincroniza a sessão local caso tenha sido passada diretamente
  try {
    localStorage.setItem('usuario_logado', JSON.stringify(usuario));
  } catch (e) {
    console.error("[Home] Erro ao salvar sessão no localStorage:", e);
  }

  const authCard = document.getElementById('auth-card');
  const homeScreen = document.getElementById('home-screen');

  if (authCard) authCard.classList.add('hidden');
  if (homeScreen) homeScreen.classList.remove('hidden');

  // Transfere toda a responsabilidade visual do perfil e lista de membros para o HomeCard
  if (typeof window.renderHomeCard === 'function') {
    window.renderHomeCard(usuario);
  }

  // Atualiza outros componentes reativos da interface se existirem
  if (typeof window.atualizarComponentesVisiveis === 'function') {
    window.atualizarComponentesVisiveis();
  }
}

async function sair() {
  // 1. Notifica e força o status Offline no PostgreSQL e no Supabase Presence antes de encerrar
  if (typeof window.atualizarStatusServidor === 'function') {
    try {
      await window.atualizarStatusServidor('offline', true);
    } catch (e) {
      console.warn("[Home] Falha ao atualizar status para offline ao sair:", e);
    }
  }

  // 2. Desconecta o HomeCard e libera ouvintes em tempo real
  if (typeof window.removerHomeCard === 'function') {
    window.removerHomeCard();
  }

  // 3. Limpa o armazenamento local de sessão
  localStorage.removeItem('usuario_logado');
  localStorage.removeItem('usuario');
  localStorage.removeItem('user');
  sessionStorage.clear();

  // 4. Recarrega a aplicação de forma limpa
  window.location.reload();
}

// Exportações Globais
window.carregarHome = carregarHome;
window.sair = sair;
