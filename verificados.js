// ==========================================================================
// BADGES & VERIFIED MODULE (verificados.js) - SPHERE V5.2 PRO (Otimizado)
// Clean Icon System, Animated Tooltips & User Rank Engine
// Integrado com editarperfil.js e perfil.js
// ==========================================================================

(function (global) {
  'use strict';

  // Injeção de Estilos CSS Otimizados
  (function injetarCssVerificados() {
    if (document.getElementById('verificados-css-v52')) return;
    const style = document.createElement('style');
    style.id = 'verificados-css-v52';
    style.textContent = `
      .chat-badge-container {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-left: 4px;
        vertical-align: middle;
        position: relative;
        flex-wrap: wrap;
      }

      .chat-badge-icon {
        font-size: 0.85rem;
        cursor: pointer;
        transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.2s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        outline: none;
        line-height: 1;
        border-radius: 50%;
      }

      .chat-badge-icon:hover,
      .chat-badge-icon:focus-visible {
        transform: scale(1.25) rotate(6deg);
        filter: brightness(1.2);
      }

      /* Cores Padrão e Efeitos Glow nos Ícones */
      .badge-creator { color: #f1c40f; text-shadow: 0 0 10px rgba(241, 196, 15, 0.5); }
      .badge-mod { color: #2ecc71; text-shadow: 0 0 10px rgba(46, 204, 113, 0.5); }
      .badge-dev { color: #00d2d3; text-shadow: 0 0 10px rgba(0, 210, 211, 0.5); }
      .badge-vip { color: #9b59b6; text-shadow: 0 0 10px rgba(155, 89, 182, 0.5); }
      .badge-booster { color: #ff4757; text-shadow: 0 0 10px rgba(255, 71, 87, 0.5); }
      .badge-verified { color: #1e90ff; text-shadow: 0 0 10px rgba(30, 144, 255, 0.5); }
      .badge-admin { color: #ff2d55; text-shadow: 0 0 10px rgba(255, 45, 85, 0.5); }

      /* Balão Flutuante (Tooltip Glassmorphism) */
      .chat-badge-tooltip {
        position: fixed;
        background: rgba(18, 8, 24, 0.95);
        border: 1px solid rgba(255, 45, 85, 0.4);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-radius: 12px;
        padding: 8px 12px;
        color: #ffffff;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.85), 0 0 15px rgba(255, 45, 85, 0.2);
        z-index: 100005 !important;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        gap: 3px;
        opacity: 0;
        transform: scale(0.9) translateY(4px);
        transition: opacity 0.18s ease, transform 0.18s ease;
        max-width: 240px;
        box-sizing: border-box;
      }

      .chat-badge-tooltip.visible {
        opacity: 1;
        transform: scale(1) translateY(0);
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
        font-size: 0.7rem;
        color: #d1c4d6;
        font-weight: 500;
        line-height: 1.35;
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
    admin: {
      nome: "Administrador",
      descricao: "Administrador do Sistema Sphere",
      icone: "fa-solid fa-shield-cat",
      classeCss: "badge-admin"
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

  // Mapeamento de Aliases para retrocompatibilidade
  const ALIAS_BADGES = {
    'criador': 'creator',
    'moderador': 'mod',
    'desenvolvedor': 'dev',
    'verificado': 'verified',
    'booster_gold': 'booster',
    'vip_member': 'vip'
  };

  /**
   * Sanitização simples para prevenção de XSS.
   */
  function escapeHTML(str) {
    if (!str) return '';
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
   * Normaliza uma chave de badge.
   */
  function normalizarChaveBadge(chave) {
    if (!chave) return 'verified';
    const cleanKey = String(chave).trim().toLowerCase();
    return ALIAS_BADGES[cleanKey] || cleanKey;
  }

  /**
   * Retorna o HTML das badges de um usuário.
   * @param {Array|String|Object} entradaChaves
   */
  function obterHtmlBadgesUsuario(entradaChaves) {
    if (!entradaChaves) return '';

    let listaGeral = [];
    let usuarioObj = null;
    let corCustom = null;

    if (typeof entradaChaves === 'object' && !Array.isArray(entradaChaves)) {
      usuarioObj = entradaChaves;
      corCustom = usuarioObj.cor_verificados || null;

      if (usuarioObj.verificados) {
        if (Array.isArray(usuarioObj.verificados)) {
          listaGeral = [...usuarioObj.verificados];
        } else if (typeof usuarioObj.verificados === 'string') {
          listaGeral = usuarioObj.verificados.split(/[,|]/).map(s => s.trim());
        }
      }

      if ((usuarioObj.is_creator || usuarioObj.is_criador) && !listaGeral.includes('creator')) {
        listaGeral.unshift('creator');
      }
      if ((usuarioObj.is_admin || usuarioObj.role === 'admin') && !listaGeral.includes('admin')) {
        listaGeral.unshift('admin');
      }
      if (usuarioObj.is_verified && !listaGeral.includes('verified')) {
        listaGeral.push('verified');
      }
    } else if (Array.isArray(entradaChaves)) {
      listaGeral = [...entradaChaves];
    } else if (typeof entradaChaves === 'string') {
      listaGeral = entradaChaves.split(/[,|]/).map(s => s.trim());
    }

    let listaFinal = listaGeral.map(normalizarChaveBadge);

    // Filtra exibição caso exista a propriedade verificados_exibir
    if (usuarioObj) {
      const exibicaoDefinida = usuarioObj.verificados_exibir || usuarioObj.verificados_selecionados || usuarioObj.badges_exibir;
      if (exibicaoDefinida !== undefined && exibicaoDefinida !== null) {
        let listaExibicao = [];
        if (Array.isArray(exibicaoDefinida)) {
          listaExibicao = exibicaoDefinida.map(normalizarChaveBadge);
        } else if (typeof exibicaoDefinida === 'string') {
          listaExibicao = exibicaoDefinida.split(/[,|]/).map(s => normalizarChaveBadge(s.trim()));
        }
        listaFinal = listaFinal.filter(b => listaExibicao.includes(b));
      }
    }

    // Remove duplicatas
    listaFinal = Array.from(new Set(listaFinal));

    if (listaFinal.length === 0) return '';

    const estiloCorCustom = corCustom ? `style="color: ${escapeHTML(corCustom)}; text-shadow: 0 0 10px ${escapeHTML(corCustom)}80;"` : '';

    const htmlIcones = listaFinal.reduce((acc, chave) => {
      const config = SISTEMA_BADGES[chave] || {
        nome: chave.toUpperCase(),
        descricao: "Selo Especial do Usuário",
        icone: "fa-solid fa-certificate",
        classeCss: "badge-verified"
      };

      return acc + `
        <span class="chat-badge-icon ${config.classeCss}" 
              data-badge-key="${escapeHTML(chave)}"
              tabindex="0"
              role="button"
              aria-label="${escapeHTML(config.nome)}"
              ${estiloCorCustom}>
          <i class="${escapeHTML(config.icone)}"></i>
        </span>
      `;
    }, '');

    return htmlIcones ? `<div class="chat-badge-container">${htmlIcones}</div>` : '';
  }

  /**
   * Gerenciamento de Instância Única do Tooltip (Performance)
   */
  let tooltipInstancia = null;

  function obterOuCriarTooltip() {
    if (!tooltipInstancia || !document.body.contains(tooltipInstancia)) {
      tooltipInstancia = document.createElement('div');
      tooltipInstancia.id = 'chat-badge-active-tooltip';
      tooltipInstancia.className = 'chat-badge-tooltip';
      tooltipInstancia.setAttribute('role', 'tooltip');
      document.body.appendChild(tooltipInstancia);
    }
    return tooltipInstancia;
  }

  function exibirBalaoVerificado(targetElement, chaveBadge) {
    if (!targetElement) return;

    const chaveNorm = normalizarChaveBadge(chaveBadge);
    const config = SISTEMA_BADGES[chaveNorm] || {
      nome: (chaveBadge || 'VERIFICADO').toUpperCase(),
      descricao: "Selo Especial do Usuário",
      icone: "fa-solid fa-certificate",
      classeCss: "badge-verified"
    };

    const tooltip = obterOuCriarTooltip();

    tooltip.innerHTML = `
      <div class="badge-tooltip-title ${config.classeCss}">
        <i class="${escapeHTML(config.icone)}"></i> ${escapeHTML(config.nome)}
      </div>
      <div class="badge-tooltip-desc">${escapeHTML(config.descricao)}</div>
    `;

    // Posicionamento inteligente
    const rect = targetElement.getBoundingClientRect();
    
    // Torna visível temporariamente para medir as dimensões reais
    tooltip.style.left = '-9999px';
    tooltip.style.top = '-9999px';
    tooltip.classList.add('visible');

    const tooltipRect = tooltip.getBoundingClientRect();

    let posX = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let posY = rect.top - tooltipRect.height - 8;

    // Ajuste contra os limites da viewport
    const paddingWindow = 10;
    posX = Math.max(paddingWindow, Math.min(window.innerWidth - tooltipRect.width - paddingWindow, posX));

    if (posY < paddingWindow) {
      posY = rect.bottom + 8; // Inverte para baixo se estourar o topo
    }

    tooltip.style.left = `${posX}px`;
    tooltip.style.top = `${posY}px`;
  }

  function ocultarBalaoVerificado() {
    if (tooltipInstancia) {
      tooltipInstancia.classList.remove('visible');
    }
  }

  // ==========================================================================
  // EVENT DELEGATION
  // ==========================================================================

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

  document.addEventListener('click', (e) => {
    const badgeElement = e.target.closest('.chat-badge-icon');
    if (badgeElement) {
      const key = badgeElement.getAttribute('data-badge-key');
      exibirBalaoVerificado(badgeElement, key);
      e.stopPropagation();
    } else {
      ocultarBalaoVerificado();
    }
  });

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

  window.addEventListener('scroll', ocultarBalaoVerificado, { passive: true, capture: true });

  // Exportação segura do Módulo
  global.SISTEMA_BADGES = SISTEMA_BADGES;
  global.obterHtmlBadgesUsuario = obterHtmlBadgesUsuario;
  global.exibirBalaoVerificado = exibirBalaoVerificado;
  global.ocultarBalaoVerificado = ocultarBalaoVerificado;

})(typeof window !== 'undefined' ? window : this);
