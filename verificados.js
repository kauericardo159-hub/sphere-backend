// ==========================================================================
// BADGES & VERIFIED MODULE (verificados.js) - SPHERE V5.2 (Otimizado)
// Clean Icon System, Animated Tooltips & User Rank Engine
// ==========================================================================

(function (global) {
  'use strict';

  // Injeção de Estilos CSS
  (function injetarCssVerificados() {
    if (document.getElementById('verificados-css-v52')) return;
    const style = document.createElement('style');
    style.id = 'verificados-css-v52';
    style.textContent = `
      .chat-badge-container {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-left: 6px;
        vertical-align: middle;
        position: relative;
      }

      .chat-badge-icon {
        font-size: 0.82rem;
        cursor: pointer;
        transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        outline: none;
      }

      .chat-badge-icon:hover,
      .chat-badge-icon:focus-visible {
        transform: scale(1.3) rotate(8deg);
      }

      /* Cores e Efeitos Glow nos Ícones */
      .badge-creator { color: #f1c40f; text-shadow: 0 0 10px rgba(241, 196, 15, 0.6); }
      .badge-mod { color: #2ecc71; text-shadow: 0 0 10px rgba(46, 204, 113, 0.6); }
      .badge-dev { color: #00d2d3; text-shadow: 0 0 10px rgba(0, 210, 211, 0.6); }
      .badge-vip { color: #9b59b6; text-shadow: 0 0 10px rgba(155, 89, 182, 0.6); }
      .badge-booster { color: #ff4757; text-shadow: 0 0 10px rgba(255, 71, 87, 0.6); }
      .badge-verified { color: #1e90ff; text-shadow: 0 0 10px rgba(30, 144, 255, 0.6); }

      /* Balão Flutuante (Tooltip Glassmorphism) */
      .chat-badge-tooltip {
        position: fixed;
        background: rgba(18, 8, 24, 0.92);
        border: 1px solid rgba(255, 45, 85, 0.4);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-radius: 12px;
        padding: 8px 12px;
        color: #ffffff;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 15px rgba(255, 45, 85, 0.2);
        z-index: 9999;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        gap: 2px;
        animation: pzBadgePop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes pzBadgePop {
        from { opacity: 0; transform: scale(0.85) translateY(4px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }

      .badge-tooltip-title {
        font-size: 0.78rem;
        font-weight: 900;
        display: flex;
        align-items: center;
        gap: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .badge-tooltip-desc {
        font-size: 0.68rem;
        color: #d1c4d6;
        font-weight: 500;
      }
    `;
    document.head.appendChild(style);
  })();

  // Dicionário Oficial de Badges e Tags
  const SISTEMA_BADGES = Object.freeze({
    creator: {
      nome: "Criador",
      descricao: "Criador de Conteúdo Oficial do Sphere",
      icone: "fa-solid fa-crown",
      classeCss: "badge-creator"
    },
    mod: {
      nome: "Moderador",
      descricao: "Guardião da Comunidade e Suporte",
      icone: "fa-solid fa-shield-halved",
      classeCss: "badge-mod"
    },
    dev: {
      nome: "Desenvolvedor",
      descricao: "Desenvolvedor do Sistema Sphere",
      icone: "fa-solid fa-code",
      classeCss: "badge-dev"
    },
    vip: {
      nome: "Membro VIP",
      descricao: "Apoiador Especial com Benefícios Exclusivos",
      icone: "fa-solid fa-gem",
      classeCss: "badge-vip"
    },
    booster: {
      nome: "Impulsionador",
      descricao: "Impulsionou a Comunidade com Super Poderes",
      icone: "fa-solid fa-bolt",
      classeCss: "badge-booster"
    },
    verified: {
      nome: "Verificado",
      descricao: "Perfil Autêntico e Confirmado",
      icone: "fa-solid fa-circle-check",
      classeCss: "badge-verified"
    }
  });

  /**
   * Sanitização simples para prevenção de XSS.
   */
  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, function (m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m];
    });
  }

  /**
   * Retorna o HTML das badges de um usuário de forma eficiente.
   * @param {Array|String} badgesUsuario Lista de chaves (ex: ['creator', 'mod'] ou "creator,mod")
   */
  function obterHtmlBadgesUsuario(badgesUsuario) {
    if (!badgesUsuario) return '';

    let listaChaves = [];
    if (Array.isArray(badgesUsuario)) {
      listaChaves = badgesUsuario;
    } else if (typeof badgesUsuario === 'string') {
      listaChaves = badgesUsuario.split(',').map(s => s.trim().toLowerCase());
    }

    const htmlIcones = listaChaves.reduce((acc, chave) => {
      const config = SISTEMA_BADGES[chave];
      if (!config) return acc;

      return acc + `
        <span class="chat-badge-icon ${config.classeCss}" 
              data-badge-key="${escapeHTML(chave)}"
              tabindex="0"
              role="button"
              aria-label="${escapeHTML(config.nome)}">
          <i class="${escapeHTML(config.icone)}"></i>
        </span>
      `;
    }, '');

    return htmlIcones ? `<div class="chat-badge-container">${htmlIcones}</div>` : '';
  }

  /**
   * Exibe o Tooltip flutuante e calcula posicionamento dinâmico.
   */
  function exibirBalaoVerificado(targetElement, chaveBadge) {
    ocultarBalaoVerificado();

    const config = SISTEMA_BADGES[chaveBadge];
    if (!config || !targetElement) return;

    const tooltip = document.createElement('div');
    tooltip.id = 'chat-badge-active-tooltip';
    tooltip.className = 'chat-badge-tooltip';
    tooltip.setAttribute('role', 'tooltip');

    tooltip.innerHTML = `
      <div class="badge-tooltip-title ${config.classeCss}">
        <i class="${escapeHTML(config.icone)}"></i> ${escapeHTML(config.nome)}
      </div>
      <div class="badge-tooltip-desc">${escapeHTML(config.descricao)}</div>
    `;

    document.body.appendChild(tooltip);

    // Posicionamento preciso do elemento inserido
    const rect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let posX = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let posY = rect.top - tooltipRect.height - 8;

    // Prevenção contra estouro nas bordas da tela
    posX = Math.min(window.innerWidth - tooltipRect.width - 10, Math.max(10, posX));
    if (posY < 10) {
      posY = rect.bottom + 8; // Exibe abaixo caso não haja espaço suficiente acima
    }

    tooltip.style.left = `${posX}px`;
    tooltip.style.top = `${posY}px`;
  }

  function ocultarBalaoVerificado() {
    const tooltip = document.getElementById('chat-badge-active-tooltip');
    if (tooltip) tooltip.remove();
  }

  // ==========================================================================
  // EVENT DELEGATION (Otimização Global de Eventos)
  // ==========================================================================

  // Disparo ao passar/clicar no ícone
  document.addEventListener('mouseover', (e) => {
    const badgeElement = e.target.closest('.chat-badge-icon');
    if (badgeElement) {
      const key = badgeElement.getAttribute('data-badge-key');
      exibirBalaoVerificado(badgeElement, key);
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (e.target.closest('.chat-badge-icon')) {
      ocultarBalaoVerificado();
    }
  });

  // Suporte a Acessibilidade por Teclado
  document.addEventListener('keydown', (e) => {
    const badgeElement = e.target.closest('.chat-badge-icon');
    if (badgeElement && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      const key = badgeElement.getAttribute('data-badge-key');
      exibirBalaoVerificado(badgeElement, key);
    } else if (e.key === 'Escape') {
      ocultarBalaoVerificado();
    }
  });

  // Fecha tooltips ao rolar
  window.addEventListener('scroll', ocultarBalaoVerificado, { passive: true, capture: true });

  // Exportação segura do Módulo
  global.SISTEMA_BADGES = SISTEMA_BADGES;
  global.obterHtmlBadgesUsuario = obterHtmlBadgesUsuario;
  global.exibirBalaoVerificado = exibirBalaoVerificado;
  global.ocultarBalaoVerificado = ocultarBalaoVerificado;

})(typeof window !== 'undefined' ? window : this);
