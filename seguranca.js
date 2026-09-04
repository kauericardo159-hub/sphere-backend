// ==========================================================================
// MÓDULO DE DIRETRIZES DE SEGURANÇA (seguranca.js) - SPHERE v5.2
// ==========================================================================

(function () {
  'use strict';

  function abrirDiretrizesSeguranca(onAceitarCallback) {
    const antigo = document.getElementById('modal-seguranca');
    if (antigo) antigo.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-seguranca';
    modal.className = 'policy-modal-overlay';

    modal.innerHTML = `
      <div class="policy-modal-card" onclick="event.stopPropagation()">
        <div class="policy-modal-header">
          <h2><i class="fa-solid fa-shield-halved"></i> Segurança e Proteção</h2>
        </div>
        <div class="policy-modal-content">
          <p>Diretrizes para garantir a máxima segurança e proteção de contas na plataforma <strong>Sphere</strong>.</p>

          <h3>1. Proteção de Senha</h3>
          <p>Utilize senhas fortes e exclusivas. A equipe do Sphere nunca solicitará sua senha pessoal por e-mail ou mensagens.</p>

          <h3>2. Prevenção Contra Golpes</h3>
          <p>Não clique em links suspeitos de terceiros compartilhados no chat direto ou em comunidades.</p>

          <h3>3. Criptografia e Tráfego Seguro</h3>
          <p>Todas as comunicações entre o cliente e os servidores Supabase utilizam criptografia SSL/TLS de ponta a ponta.</p>

          <h3>4. Monitoramento e Defesa</h3>
          <p>Sistemas automatizados de moderação monitoram comportamentos anômalos para prevenir ataques e acessos não autorizados.</p>
        </div>
        <div class="policy-modal-actions">
          <button class="btn-policy-action sec" id="btn-fechar-seguranca">Fechar</button>
          ${onAceitarCallback ? `<button class="btn-policy-action primary" id="btn-aceitar-seguranca"><i class="fa-solid fa-check"></i> Li e Concordo</button>` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('btn-fechar-seguranca').onclick = () => modal.remove();

    if (onAceitarCallback) {
      document.getElementById('btn-aceitar-seguranca').onclick = () => {
        localStorage.setItem('sphere_seguranca_aceita', 'true');
        modal.remove();
        onAceitarCallback();
      };
    }
  }

  function verificarTodosTermosAceitos() {
    const termos = localStorage.getItem('sphere_termos_aceitos') === 'true';
    const privacidade = localStorage.getItem('sphere_privacidade_aceita') === 'true';
    const seguranca = localStorage.getItem('sphere_seguranca_aceita') === 'true';
    return termos && privacidade && seguranca;
  }

  window.abrirDiretrizesSeguranca = abrirDiretrizesSeguranca;
  window.verificarTodosTermosAceitos = verificarTodosTermosAceitos;
})();
