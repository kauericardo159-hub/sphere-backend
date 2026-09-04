// ==========================================================================
// MÓDULO DE POLÍTICA DE PRIVACIDADE (privacidade.js) - SPHERE v5.2
// ==========================================================================

(function () {
  'use strict';

  function abrirPoliticaPrivacidade(onAceitarCallback) {
    const antigo = document.getElementById('modal-privacidade');
    if (antigo) antigo.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-privacidade';
    modal.className = 'policy-modal-overlay';

    modal.innerHTML = `
      <div class="policy-modal-card" onclick="event.stopPropagation()">
        <div class="policy-modal-header">
          <h2><i class="fa-solid fa-user-lock"></i> Política de Privacidade</h2>
        </div>
        <div class="policy-modal-content">
          <p>No <strong>Sphere</strong>, levamos a proteção dos seus dados a sério. Esta política descreve como tratamos suas informações.</p>

          <h3>1. Coleta de Dados</h3>
          <p>Coletamos dados essenciais como nome de usuário, e-mail (quando fornecido), dados de presença e histórico de interações necessárias ao funcionamento da plataforma.</p>

          <h3>2. Uso das Informações</h3>
          <p>Seus dados são usados exclusivamente para autenticação, personalização do perfil e comunicação em tempo real no aplicativo.</p>

          <h3>3. Compartilhamento</h3>
          <p>Não vendemos nem compartilhamos seus dados pessoais com terceiros para fins comerciais ou publicitários.</p>

          <h3>4. Armazenamento e Exclusão</h3>
          <p>Você pode solicitar a exclusão definitiva de sua conta e de seus dados a qualquer momento nas Configurações da conta.</p>
        </div>
        <div class="policy-modal-actions">
          <button class="btn-policy-action sec" id="btn-fechar-privacidade">Fechar</button>
          ${onAceitarCallback ? `<button class="btn-policy-action primary" id="btn-aceitar-privacidade"><i class="fa-solid fa-check"></i> Li e Concordo</button>` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('btn-fechar-privacidade').onclick = () => modal.remove();

    if (onAceitarCallback) {
      document.getElementById('btn-aceitar-privacidade').onclick = () => {
        localStorage.setItem('sphere_privacidade_aceita', 'true');
        modal.remove();
        onAceitarCallback();
      };
    }
  }

  window.abrirPoliticaPrivacidade = abrirPoliticaPrivacidade;
})();
