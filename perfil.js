// ==========================================================================
// MÓDULO DE PERFIL DE USUÁRIO (perfil.js) - PROJECT Z ENHANCED v5.1
// Integrado com status.js (int8), Pilha de Navegação, Realtime & Social
// ==========================================================================

(function () {
  'use strict';

  // --- Sistema de Pilha de Navegação (Histórico) e Realtime ---
  let historicoPerfis = [];
  let canalRealtimePerfil = null;

  // Sanitização de HTML contra vulnerabilidades XSS
  function sanitizarHtmlPerfil(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Toast de Notificação do Perfil
  function mostrarToastPerfil(mensagem, tipo = 'info', tempo = 2500) {
    const antigo = document.getElementById('perfil-toast-msg');
    if (antigo) antigo.remove();

    const toast = document.createElement('div');
    toast.id = 'perfil-toast-msg';
    toast.className = `perfil-toast-message perfil-toast-${tipo}`;
    toast.innerHTML = `<span>${mensagem}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast && document.body.contains(toast)) {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
      }
    }, tempo);
  }

  function extrairDataCriacaoReal(usuario) {
    if (!usuario) return null;

    const chavesData = [
      'created_at', 'data_criacao', 'inserted_at', 
      'createdAt', 'data_cadastro', 'joined_at', 
      'timestamp', 'created_time'
    ];

    for (const chave of chavesData) {
      if (usuario[chave]) {
        const d = new Date(usuario[chave]);
        if (!isNaN(d.getTime())) return d;
      }
    }

    if (typeof usuario.id === 'number' && usuario.id > 1500000000000) {
      const d = new Date(usuario.id);
      if (!isNaN(d.getTime())) return d;
    }

    try {
      const authData = JSON.parse(localStorage.getItem('sb-auth-token') || '{}');
      if (authData?.user?.created_at && String(authData.user.id) === String(usuario.id)) {
        const d = new Date(authData.user.created_at);
        if (!isNaN(d.getTime())) return d;
      }
    } catch (e) {}

    return null;
  }

  function formatarDataMembroDesde(usuario) {
    const dataObj = extrairDataCriacaoReal(usuario);
    if (!dataObj) return 'Membro fundador';
    try {
      return dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch (e) {
      return 'Membro ativo';
    }
  }

  function calcularTempoDeConta(usuario) {
    const dataObj = extrairDataCriacaoReal(usuario);
    if (!dataObj) return '';

    const agora = new Date();
    const diffMs = agora - dataObj;
    const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (dias < 30) return `${dias} dia${dias === 1 ? '' : 's'} na comunidade`;
    const meses = Math.floor(dias / 30);
    if (meses < 12) return `${meses} mês${meses === 1 ? '' : 'es'} na comunidade`;
    const anos = Math.floor(meses / 12);
    return `${anos} ano${anos === 1 ? '' : 's'} na comunidade`;
  }

  function formatarNumeroMetrica(num) {
    const valor = Number(num) || 0;
    if (valor >= 1000000) return (valor / 1000000).toFixed(1) + 'M';
    if (valor >= 1000) return (valor / 1000).toFixed(1) + 'k';
    return valor.toString();
  }

  function obterMeuIdLogado() {
    try {
      const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
      if (!raw) return null;
      const usuario = JSON.parse(raw);
      return usuario && usuario.id !== undefined && usuario.id !== null ? Number(usuario.id) : null;
    } catch (e) {
      return null;
    }
  }

  function renderizarBadgesVerificados(verificadosStr) {
    if (!verificadosStr) return '';
    const itens = String(verificadosStr).split('|').map(s => s.trim()).filter(Boolean);
    if (itens.length === 0) return '';

    return `
      <div class="perfil-badges-wrapper">
        ${itens.map(item => `
          <span class="perfil-badge-item"><i class="fa-solid fa-circle-check"></i> ${sanitizarHtmlPerfil(item)}</span>
        `).join('')}
      </div>
    `;
  }

  function renderizarTagsPerfil(tagsStr) {
    if (!tagsStr) return '';
    const tags = String(tagsStr).split('|').map(t => t.trim()).filter(Boolean);
    if (tags.length === 0) return '';

    return `
      <div class="perfil-tags-container">
        ${tags.map(tag => `<span class="perfil-tag-chip">#${sanitizarHtmlPerfil(tag)}</span>`).join('')}
      </div>
    `;
  }

  function obterLabelStatus(status) {
    const mapa = {
      online: { texto: 'Disponível', cor: '#23a55a', icone: 'fa-circle' },
      ausente: { texto: 'Ausente', cor: '#f0b232', icone: 'fa-moon' },
      dnd: { texto: 'Não Perturbe', cor: '#f23f43', icone: 'fa-minus-circle' },
      offline: { texto: 'Invisível', cor: '#80848e', icone: 'fa-eye-slash' }
    };
    return mapa[(status || '').toLowerCase()] || mapa.offline;
  }

  function renderizarBadgeCargo(usuario) {
    if (usuario.is_creator || usuario.is_criador) return `<span class="user-role-badge role-creator" title="Criador da Comunidade"><i class="fa-solid fa-wand-magic-sparkles"></i> Creator</span>`;
    if (usuario.is_admin || usuario.role === 'admin') return `<span class="user-role-badge role-admin" title="Administrador da Plataforma"><i class="fa-solid fa-crown"></i> Admin</span>`;
    if (usuario.role === 'mod' || usuario.is_mod) return `<span class="user-role-badge role-mod" title="Moderador"><i class="fa-solid fa-shield-halved"></i> Mod</span>`;
    return '';
  }

  function copiarParaAreaTransferencia(texto, rotulo) {
    if (!navigator.clipboard) {
      mostrarToastPerfil(`Cópia manual: ${texto}`, 'info');
      return;
    }
    navigator.clipboard.writeText(texto).then(() => {
      mostrarToastPerfil(`${rotulo} copiado com sucesso!`, 'sucesso');
    }).catch(() => {
      mostrarToastPerfil(`Falha ao copiar ${rotulo}.`, 'erro');
    });
  }

  async function compartilharPerfil(usuario) {
    if (!usuario) return;

    const usernameStr = usuario.username || 'usuario';
    const nomeStr = usuario.display_name || usuario.nome || usernameStr;
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?user=${encodeURIComponent(usernameStr)}`;

    const dadosShare = {
      title: `Perfil de ${nomeStr} - Project Z`,
      text: `Confira o perfil de @${usernameStr} no Project Z!`,
      url: shareUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(dadosShare);
        mostrarToastPerfil('Perfil compartilhado com sucesso!', 'sucesso');
      } catch (err) {
        if (err.name !== 'AbortError') copiarParaAreaTransferencia(shareUrl, 'Link do Perfil');
      }
    } else {
      copiarParaAreaTransferencia(shareUrl, 'Link do Perfil');
    }
  }

  function enviarMensagemParaUsuario(userTarget) {
    fecharPerfilResetandoHistorico();

    if (typeof window.alternarAbaNav === 'function') {
      window.alternarAbaNav('chat');
    } else if (typeof window.abrirInterfaceChat === 'function') {
      window.abrirInterfaceChat();
    }

    setTimeout(() => {
      if (typeof window.seleccionarConversaDirect === 'function') {
        window.seleccionarConversaDirect(userTarget);
      } else if (typeof window.abrirChatComUsuario === 'function') {
        window.abrirChatComUsuario(userTarget);
      }
    }, 150);
  }

  function cancelarInscricaoRealtimePerfil() {
    const sb = window.supabaseClient || window.supabase || window.sb;
    if (canalRealtimePerfil && sb) {
      sb.removeChannel(canalRealtimePerfil);
      canalRealtimePerfil = null;
    }
  }

  // ========================================================================
  // LÓGICA DE ABERTURA E RENDERIZAÇÃO DO PERFIL (Com Pilha de Histórico)
  // ========================================================================
  
  async function abrirPerfil(usuarioInput, ehVoltar = false) {
    const logadoRaw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
    const logado = logadoRaw ? JSON.parse(logadoRaw) : null;

    let user = usuarioInput || logado;
    if (!user || user.id === undefined) return;

    const meuId = obterMeuIdLogado();
    const idAlvoNum = Number(user.id);
    const ehMeuPerfil = meuId !== null && meuId === idAlvoNum;

    // Gerenciamento da Pilha de Histórico
    if (!ehVoltar && window._perfilUsuarioCache) {
      const idAtualCache = Number(window._perfilUsuarioCache.id);
      
      if (idAtualCache !== idAlvoNum) {
        const ultimoNoHistorico = historicoPerfis[historicoPerfis.length - 1];
        if (!ultimoNoHistorico || Number(ultimoNoHistorico.id) !== idAtualCache) {
          historicoPerfis.push(window._perfilUsuarioCache);
        }
      }
    }

    cancelarInscricaoRealtimePerfil();

    // Limpa a instância atual do DOM sem zerar a pilha de histórico
    const containerExistente = document.getElementById('perfil-full-container');
    if (containerExistente) containerExistente.remove();

    if (typeof window.ocultarHomeCard === 'function') {
      window.ocultarHomeCard();
    }

    window._perfilUsuarioCache = user;

    // Sincronização em tempo real via Supabase
    const sb = window.supabaseClient || window.supabase || window.sb;
    if (sb && idAlvoNum) {
      try {
        const { data } = await sb.from('usuarios').select('*').eq('id', idAlvoNum).single();
        if (data) {
          user = { ...user, ...data };
          window._perfilUsuarioCache = user;
          if (ehMeuPerfil) {
            localStorage.setItem('usuario_logado', JSON.stringify(user));
          }
        }

        canalRealtimePerfil = sb
          .channel(`public:usuario_perfil_${idAlvoNum}`)
          .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'usuarios', 
            filter: `id=eq.${idAlvoNum}` 
          }, (payload) => {
            if (payload.new) {
              window._perfilUsuarioCache = { ...window._perfilUsuarioCache, ...payload.new };
              if (ehMeuPerfil) {
                localStorage.setItem('usuario_logado', JSON.stringify(window._perfilUsuarioCache));
              }
              abrirPerfil(window._perfilUsuarioCache, true);
            }
          })
          .subscribe();

      } catch (err) {
        console.warn("[Perfil] Sincronização remota pendente:", err);
      }
    }

    const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(user.username || 'user')}`;
    const avatarSrc = (user.avatar_url && user.avatar_url.trim() !== '') ? user.avatar_url : defaultAvatar;
    const molduraSrc = (user.moldura_url && user.moldura_url.trim() !== '') ? user.moldura_url : null;

    const defaultBanner = 'linear-gradient(135deg, #ff2d55, #6c5ce7)';
    const bannerStyle = (user.banner_url && user.banner_url.trim() !== '')
      ? `background-image: url('${user.banner_url}');`
      : `background: ${defaultBanner};`;

    const eCriador = Boolean(user.is_creator || user.is_criador);
    const nomeExibicao = user.display_name || user.nome || user.username || 'Usuário';
    const dataMembroTexto = formatarDataMembroDesde(user);
    const tempoDeContaTexto = calcularTempoDeConta(user);
    const statusObj = obterLabelStatus(user.status || 'offline');

    // Injeção reativa do indicador de presença com o ID int8 do usuário
    let htmlStatusDot = '';
    if (typeof window.obterHtmlStatusDot === 'function') {
      const dotInner = window.obterHtmlStatusDot(user.status || 'offline', user.id);
      htmlStatusDot = `<div class="avatar-status-badge">${dotInner}</div>`;
    } else {
      htmlStatusDot = `<div class="avatar-status-badge"><span class="status-dot offline" data-user-status-id="${user.id}"></span></div>`;
    }

    const emojiStatus = user.status_emoji || '💬';
    const customStatusHtml = user.custom_status
      ? `<div class="perfil-custom-status" title="Recado Atual">
           <span class="custom-status-emoji">${emojiStatus}</span>
           <span class="custom-status-text">${sanitizarHtmlPerfil(user.custom_status)}</span>
         </div>`
      : '';

    const htmlVerificados = renderizarBadgesVerificados(user.verificados);
    const htmlTags = renderizarTagsPerfil(user.tags);
    const htmlBadgeCargo = renderizarBadgeCargo(user);

    const sobreMimTexto = (user.sobre && user.sobre.trim() !== '')
      ? sanitizarHtmlPerfil(user.sobre)
      : '<span class="perfil-bio-empty">Nenhuma biografia adicionada ainda.</span>';

    // Ações Rápidas de Banner
    let botoesAcaoBanner = '';
    if (ehMeuPerfil) {
      botoesAcaoBanner = `
        <button class="btn-editar-banner" onclick="if(typeof window.abrirModalEditarPerfil === 'function') window.abrirModalEditarPerfil();">
          <i class="fa-solid fa-pen-to-square"></i> Editar Perfil
        </button>`;
    } else {
      botoesAcaoBanner = `
        <div class="perfil-social-actions-group">
          <button id="btn-perfil-mensagem" class="btn-perfil-action highlight" onclick="window.enviarMensagemParaUsuario(window._perfilUsuarioCache)">
            <i class="fa-solid fa-paper-plane"></i> Mensagem
          </button>
          <button id="btn-perfil-seguir" class="btn-perfil-action" onclick="window.executarAcaoSeguir(${idAlvoNum})">
            <i class="fa-solid fa-user-plus"></i> Seguir
          </button>
          <button id="btn-perfil-amizade" class="btn-perfil-action" onclick="window.executarAcaoAmizade(${idAlvoNum})">
            <i class="fa-solid fa-handshake"></i> Adicionar
          </button>
        </div>`;
    }

    // Regra do Botão de Ação Superior (Voltar vs Fechar vs Omissão)
    const temHistorico = historicoPerfis.length > 0;
    let botaoVoltarOuFechar = '';

    if (ehMeuPerfil) {
      if (temHistorico) {
        botaoVoltarOuFechar = `
          <button class="btn-fechar-perfil" onclick="window.voltarOuFecharPerfil()" title="Voltar para o perfil anterior">
            <i class="fa-solid fa-arrow-left"></i>
          </button>
        `;
      }
    } else {
      const iconeBotaoTop = temHistorico ? 'fa-arrow-left' : 'fa-xmark';
      const titleBotaoTop = temHistorico ? 'Voltar para o perfil anterior' : 'Fechar Perfil (ESC)';
      botaoVoltarOuFechar = `
        <button class="btn-fechar-perfil" onclick="window.voltarOuFecharPerfil()" title="${titleBotaoTop}">
          <i class="fa-solid ${iconeBotaoTop}"></i>
        </button>
      `;
    }

    const container = document.createElement('div');
    container.id = 'perfil-full-container';
    container.className = `perfil-full-container ${eCriador ? 'is-creator' : ''}`;

    container.innerHTML = `
      <div class="perfil-content-wrapper" onclick="event.stopPropagation();">
        ${botaoVoltarOuFechar}

        <!-- Banner de Capa -->
        <div class="perfil-banner" style="${bannerStyle}">
          <div class="perfil-banner-overlay"></div>
          ${botoesAcaoBanner}
        </div>
        
        <!-- Cabeçalho Principal -->
        <div class="perfil-header">
          <div class="perfil-avatar-wrapper">
            <div class="perfil-avatar-container">
              <img src="${avatarSrc}" class="perfil-avatar" onerror="this.onerror=null; this.src='${defaultAvatar}';" alt="Avatar">
              ${molduraSrc ? `<img src="${molduraSrc}" class="perfil-moldura" alt="Moldura">` : ''}
              ${htmlStatusDot}
            </div>
          </div>
          
          <div class="perfil-names-container">
            <div class="perfil-display-row">
              <span class="perfil-display-name">${sanitizarHtmlPerfil(nomeExibicao)}</span>
              ${user.is_verified ? '<i class="fa-solid fa-circle-check perfil-verified-icon" title="Conta Verificada"></i>' : ''}
              ${htmlBadgeCargo}
            </div>
            
            <div class="perfil-handle-row">
              <span class="perfil-handle-username" onclick="window.copiarHandleUsuario('@${sanitizarHtmlPerfil(user.username || 'usuario')}')" title="Clique para copiar">
                @${sanitizarHtmlPerfil(user.username || 'usuario')} <i class="fa-regular fa-copy copy-icon"></i>
              </span>
              <button class="btn-compartilhar-perfil" onclick="window.compartilharPerfil(window._perfilUsuarioCache)" title="Compartilhar Perfil">
                <i class="fa-solid fa-share-nodes"></i> Compartilhar
              </button>
            </div>

            ${customStatusHtml}
            ${htmlVerificados}
          </div>

          <!-- Metadados de Perfil -->
          <div class="perfil-meta-info">
            <div class="perfil-meta-item clickable" onclick="window.copiarIdUsuario('${user.id || ''}')" title="Clique para copiar ID">
              <i class="fa-solid fa-hashtag"></i> ID: ${user.id || 'N/A'}
            </div>
            <div class="perfil-meta-item" title="${tempoDeContaTexto}">
              <i class="fa-solid fa-calendar-days"></i> Membro desde: ${dataMembroTexto}
            </div>
            <div class="perfil-meta-item" title="Estado de Presença">
              <i class="fa-solid ${statusObj.icone}" style="color: ${statusObj.cor}; font-size: 0.75rem;"></i> Status: ${statusObj.texto}
            </div>
            ${user.nivel ? `
              <div class="perfil-meta-item" title="Nível do Perfil">
                <i class="fa-solid fa-bolt" style="color:#ff2d55;"></i> Nível ${user.nivel}
              </div>
            ` : ''}
          </div>

          <!-- Barra de Estatísticas Sociais -->
          <div class="perfil-stats-bar">
            <div class="stat-item" onclick="if(typeof window.abrirListaSocial === 'function') window.abrirListaSocial(${idAlvoNum}, 'amigos')">
              <span class="stat-value" id="perfil-total-amigos">${formatarNumeroMetrica(user.total_amigos)}</span>
              <span class="stat-label">Amigos</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item" onclick="if(typeof window.abrirListaSocial === 'function') window.abrirListaSocial(${idAlvoNum}, 'seguindo')">
              <span class="stat-value" id="perfil-total-seguindo">${formatarNumeroMetrica(user.total_seguindo)}</span>
              <span class="stat-label">Seguindo</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item" onclick="if(typeof window.abrirListaSocial === 'function') window.abrirListaSocial(${idAlvoNum}, 'seguidores')">
              <span class="stat-value" id="perfil-total-seguidores">${formatarNumeroMetrica(user.total_seguidores)}</span>
              <span class="stat-label">Seguidores</span>
            </div>
          </div>

          <!-- Tags de Perfil -->
          ${htmlTags}

          <!-- Seção Biografia -->
          <div class="perfil-bio-section">
            <div class="perfil-bio-title">
              <i class="fa-solid fa-align-left"></i> Sobre mim
            </div>
            <div class="perfil-bio-text">${sobreMimTexto}</div>
          </div>
        </div>
      </div>
    `;

    // Clicar fora do card executa a rotina de voltar/fechar
    container.addEventListener('click', voltarOuFecharPerfil);
    document.body.appendChild(container);

    // Registra listener de teclado para ESC
    document.removeEventListener('keydown', tratarEscPerfil);
    document.addEventListener('keydown', tratarEscPerfil);

    await carregarMetricasESocialPerfil(idAlvoNum, ehMeuPerfil);
  }

  // Decisão de Navegação: Volta para o perfil anterior ou fecha
  function voltarOuFecharPerfil() {
    cancelarInscricaoRealtimePerfil();

    if (historicoPerfis.length > 0) {
      const perfilAnterior = historicoPerfis.pop();
      abrirPerfil(perfilAnterior, true);
    } else {
      fecharPerfilResetandoHistorico();
    }
  }

  function tratarEscPerfil(e) {
    if (e.key === 'Escape') {
      const meuId = obterMeuIdLogado();
      const idCache = window._perfilUsuarioCache ? Number(window._perfilUsuarioCache.id) : null;
      
      // Bloqueia tecla ESC no perfil próprio quando não houver pilha de histórico
      if (meuId !== null && meuId === idCache && historicoPerfis.length === 0) {
        return;
      }
      voltarOuFecharPerfil();
    }
  }

  function fecharPerfilResetandoHistorico() {
    cancelarInscricaoRealtimePerfil();
    historicoPerfis = [];
    window._perfilUsuarioCache = null;

    const container = document.getElementById('perfil-full-container');
    if (container) container.remove();
    document.removeEventListener('keydown', tratarEscPerfil);

    if (typeof window.exibirHomeCard === 'function') {
      window.exibirHomeCard();
    }
  }

  // ========================================================================
  // ROTINAS SOCIAIS (Carregamento de Métricas e Botões)
  // ========================================================================

  async function carregarMetricasESocialPerfil(idAlvo, ehMeuPerfil) {
    if (typeof window.obterStatusRelacionamentoESocial !== 'function') return;

    try {
      const dados = await window.obterStatusRelacionamentoESocial(idAlvo);
      if (!dados) return;

      const elAmigos = document.getElementById('perfil-total-amigos');
      const elSeguindo = document.getElementById('perfil-total-seguindo');
      const elSeguidores = document.getElementById('perfil-total-seguidores');

      if (elAmigos) elAmigos.textContent = formatarNumeroMetrica(dados.totalAmigos);
      if (elSeguindo) elSeguindo.textContent = formatarNumeroMetrica(dados.totalSeguindo);
      if (elSeguidores) elSeguidores.textContent = formatarNumeroMetrica(dados.totalSeguidores);

      if (!ehMeuPerfil) {
        const btnSeguir = document.getElementById('btn-perfil-seguir');
        const btnAmizade = document.getElementById('btn-perfil-amizade');

        if (btnSeguir) {
          if (dados.seguindo) {
            btnSeguir.innerHTML = `<i class="fa-solid fa-user-check"></i> Seguindo`;
            btnSeguir.classList.add('active');
          } else {
            btnSeguir.innerHTML = `<i class="fa-solid fa-user-plus"></i> Seguir`;
            btnSeguir.classList.remove('active');
          }
        }

        if (btnAmizade) {
          if (dados.statusAmizade === 'amigos') {
            btnAmizade.innerHTML = `<i class="fa-solid fa-user-group"></i> Amigos`;
            btnAmizade.classList.add('active');
          } else if (dados.statusAmizade === 'solicitado_por_mim') {
            btnAmizade.innerHTML = `<i class="fa-solid fa-clock"></i> Pendente`;
            btnAmizade.classList.add('pending');
          } else if (dados.statusAmizade === 'recebido_do_outro') {
            btnAmizade.innerHTML = `<i class="fa-solid fa-check"></i> Aceitar`;
            btnAmizade.classList.add('highlight');
          } else {
            btnAmizade.innerHTML = `<i class="fa-solid fa-handshake"></i> Adicionar`;
            btnAmizade.classList.remove('active', 'pending', 'highlight');
          }
        }
      }
    } catch (err) {
      console.error("[Perfil] Erro ao carregar métricas sociais:", err);
    }
  }

  async function executarAcaoSeguir(idAlvo) {
    const btn = document.getElementById('btn-perfil-seguir');
    if (btn) btn.disabled = true;

    if (typeof window.alternarSeguir === 'function') {
      const res = await window.alternarSeguir(idAlvo);
      if (res && res.sucesso) {
        await carregarMetricasESocialPerfil(idAlvo, false);
      }
    }

    if (btn) btn.disabled = false;
  }

  async function executarAcaoAmizade(idAlvo) {
    const btn = document.getElementById('btn-perfil-amizade');
    if (btn) btn.disabled = true;

    if (typeof window.alternarSolicitacaoAmizade === 'function') {
      const res = await window.alternarSolicitacaoAmizade(idAlvo);
      if (res && res.sucesso) {
        await carregarMetricasESocialPerfil(idAlvo, false);
      }
    }

    if (btn) btn.disabled = false;
  }

  // Deeplink via URL (?user=@username ou ?id=123)
  async function verificarDeeplinkPerfilURL() {
    const params = new URLSearchParams(window.location.search);
    const targetUser = params.get('user');
    const targetId = params.get('id');

    if (!targetUser && !targetId) return;

    const sb = window.supabaseClient || window.supabase || window.sb;
    if (!sb) return;

    try {
      let query = sb.from('usuarios').select('*');
      if (targetUser) {
        const usernameClean = targetUser.replace('@', '').trim().toLowerCase();
        query = query.eq('username', usernameClean);
      } else if (targetId) {
        query = query.eq('id', Number(targetId));
      }

      const { data } = await query.single();
      if (data) {
        abrirPerfil(data);
      }
    } catch (e) {
      console.warn("[Perfil] Falha ao processar deeplink de perfil:", e);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(verificarDeeplinkPerfilURL, 500);
  });

  // Exportações Globais
  window.abrirPerfil = abrirPerfil;
  window.fecharPerfil = fecharPerfilResetandoHistorico;
  window.voltarOuFecharPerfil = voltarOuFecharPerfil;
  window.compartilharPerfil = compartilharPerfil;
  window.executarAcaoSeguir = executarAcaoSeguir;
  window.executarAcaoAmizade = executarAcaoAmizade;
  window.enviarMensagemParaUsuario = enviarMensagemParaUsuario;
  window.copiarHandleUsuario = (handle) => copiarParaAreaTransferencia(handle, 'Nome de usuário');
  window.copiarIdUsuario = (id) => copiarParaAreaTransferencia(id, 'ID do usuário');
})();
