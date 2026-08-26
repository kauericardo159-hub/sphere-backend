// home.js (Versão Limpa)

function carregarHome(usuario) {
  if (!usuario) return;

  const authCard = document.getElementById('auth-card');
  const homeScreen = document.getElementById('home-screen');

  if (authCard) authCard.classList.add('hidden');
  if (homeScreen) homeScreen.classList.remove('hidden');

  // O home.js NÃO deve mais mexer em avatares ou nomes.
  // Ele apenas chama o HomeCard para fazer o trabalho dele.
  if (typeof renderHomeCard === 'function') {
    renderHomeCard(usuario);
  }

  if (typeof atualizarComponentesVisiveis === 'function') {
    atualizarComponentesVisiveis();
  }
}

function sair() {
  localStorage.removeItem('usuario_logado');
  // ... resto da função sair ...
  window.location.reload(); // Recarregar é o jeito mais limpo de garantir que tudo foi limpo
}
