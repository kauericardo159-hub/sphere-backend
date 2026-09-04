// ==========================================================================
// MÓDULO DE TERMOS DE USO (termos.js) - SPHERE v5.2
// ==========================================================================

(function () {
  'use strict';

  // Injeção de CSS Dinâmico para Termos
  (function injetarCssTermos() {
    if (document.getElementById('termos-css')) return;
    const style = document.createElement('style');
    style.id = 'termos-css';
    style.textContent = `
      .policy-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(8, 4, 12, 0.90);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        z-index: 2500;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        box-sizing: border-box;
        animation: fadeInPolicy 0.25s ease-out;
      }

      @keyframes fadeInPolicy {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1); }
      }

      .policy-modal-card {
        width: 100%;
        max-width: 540px;
        max-height: 85vh;
        background: #140b17;
        border: 1px solid rgba(255, 45, 85, 0.3);
        border-radius: 24px;
        padding: 24px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(255, 45, 85, 0.15);
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
      }

      .policy-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        padding-bottom: 12px;
      }

      .policy-modal-header h2 {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 800;
        color: #ffffff;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .policy-modal-header h2 i {
        color: #ff2d55;
      }

      .policy-modal-content {
        flex: 1;
        overflow-y: auto;
        padding-right: 8px;
        color: #e2d8e5;
        font-size: 0.88rem;
        line-height: 1.6;
      }

      .policy-modal-content::-webkit-scrollbar {
        width: 5px;
      }
      .policy-modal-content::-webkit-scrollbar-thumb {
        background: rgba(255, 45, 85, 0.4);
        border-radius: 10px;
      }

      .policy-modal-content h3 {
        color: #ff2d55;
        font-size: 0.95rem;
        margin-top: 14px;
        margin-bottom: 6px;
      }

      .policy-modal-actions {
        display: flex;
        gap: 10px;
        margin-top: 18px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }

      .btn-policy-action {
        flex: 1;
        height: 38px;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 800;
        cursor: pointer;
        border: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s ease;
      }

      .btn-policy-action.sec {
        background: rgba(255, 255, 255, 0.08);
        color: #b3a5b8;
      }

      .btn-policy-action.sec:hover {
        background: rgba(255, 255, 255, 0.16);
        color: #ffffff;
      }

      .btn-policy-action.primary {
        background: #ff2d55;
        color: #ffffff;
        box-shadow: 0 4px 15px rgba(255, 45, 85, 0.35);
      }

      .btn-policy-action.primary:hover {
        background: #e02447;
      }
    `;
    document.head.appendChild(style);
  })();

  function abrirTermosDeUso(onAceitarCallback) {
    const antigo = document.getElementById('modal-termos-uso');
    if (antigo) antigo.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-termos-uso';
    modal.className = 'policy-modal-overlay';

    modal.innerHTML = `
      <div class="policy-modal-card" onclick="event.stopPropagation()">
        <div class="policy-modal-header">
          <h2><i class="fa-solid fa-file-contract"></i> Termos de Uso</h2>
        </div>
        <div class="policy-modal-content">
          <p>Bem-vindo ao <strong>Sphere</strong>. Ao utilizar nossa plataforma, você concorda expressamente com as regras descritas abaixo.</p>

          <h3>1. Conduta e Respeito</h3>
          <p>É estritamente proibido o envio de spam, conteúdos odiosos, assédio ou qualquer comportamento que viole a integridade de outros usuários.</p>

          <h3>2. Responsabilidade da Conta</h3>
          <p>Você é o único responsável pela segurança das suas credenciais e por todas as ações realizadas em sua conta.</p>

          <h3>3. Uso Indevido do Sistema</h3>
          <p>Tentativas de exploração de vulnerabilidades, bots não autorizados ou engenharia reversa resultarão no banimento imediato da conta.</p>

          <h3>4. Modificações do Serviço</h3>
          <p>O Sphere reserva-se o direito de atualizar funcionalidades e políticas para manter a estabilidade e segurança da comunidade.</p>
        </div>
        <div class="policy-modal-actions">
          <button class="btn-policy-action sec" id="btn-fechar-termos">Fechar</button>
          ${onAceitarCallback ? `<button class="btn-policy-action primary" id="btn-aceitar-termos"><i class="fa-solid fa-check"></i> Li e Concordo</button>` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('btn-fechar-termos').onclick = () => modal.remove();

    if (onAceitarCallback) {
      document.getElementById('btn-aceitar-termos').onclick = () => {
        localStorage.setItem('sphere_termos_aceitos', 'true');
        modal.remove();
        onAceitarCallback();
      };
    }
  }

  window.abrirTermosDeUso = abrirTermosDeUso;
})();
