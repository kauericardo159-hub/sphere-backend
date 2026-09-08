// ==========================================================================
// MÓDULO DE PERFIL DE USUÁRIO (perfil.js) - SPHERE v5.2 PRO
// Sincronizado com status.js, verificados.js, editarperfil.js & Realtime CDC
// Suporte a Bloqueio de Perfil por Conta Banida / Desativada
// ==========================================================================

(function (global) {
  'use strict';

  let historicoPerfis = [];
  let canalRealtimePerfil = null;

  function sanitizarHtmlPerfil(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function mostrarToastPerfil(mensagem, tipo = 'info', tempo = 2500) {
    const antigo = document.getElementById('perfil-toast-msg');
    if (antigo) antigo.remove();

    const toast = document.createElement('div');
    toast.id = 'perfil-toast-msg';
    toast.className = `perfil-toast-message perfil-toast-${tipo}`;
    toast.innerHTML = `<i class="fa-solid ${tipo === 'sucesso' ? 'fa-circle-check' : 'fa-circle-info'}"></i> <span>${mensagem}</span>`;
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

  function calcularIdadeFormatada(dataNascimento) {
    if (!dataNascimento) return 'Não informada';
    const nascimento = new Date(dataNascimento);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return isNaN(idade) || idade < 0 ? 'Não informada' : `${idade} anos`;
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

  function renderizarBadgesVerificados(usuario) {
    if (!usuario) return '';

    if (typeof global.obterHtmlBadgesUsuario === 'function') {
      return global.obterHtmlBadgesUsuario(usuario);
    }

    let listaBadgesGerais = [];

    if (usuario.verificados) {
      if (Array.isArray(usuario.verificados)) {
        listaBadgesGerais = [...usuario.verificados];
      } else if (typeof usuario.verificados === 'string') {
        listaBadgesGerais = usuario.verificados.split(/[,|]/).map(s => s.trim().toLowerCase());
      }
    }

    if ((usuario.is_creator || usuario.is_criador) && !listaBadgesGerais.includes('creator')) {
      listaBadgesGerais.unshift('creator');
    }

    if (usuario.is_verified && !listaBadgesGerais.includes('verified')) {
      listaBadgesGerais.push('verified');
    }

    if (listaBadgesGerais.length === 0) return '';

    const corIcone = usuario.cor_verificados || usuario.cor_tema || '#ff2d55';

    return `
      <div class="chat-badge-container" style="display: inline-flex; align-items: center; gap: 4px;">
        ${listaBadgesGerais.map(item => `
          <span class="chat-badge-icon badge-${sanitizarHtmlPerfil(item)}" title="Selo: ${sanitizarHtmlPerfil(item)}">
            <i class="fa-solid fa-certificate" style="color: ${corIcone};"></i>
          </span>
        `).join('')}
      </div>
    `;
  }

  function renderizarTagsPerfil(tagsStr) {
    if (!tagsStr) return '';
    const tags = String(tagsStr).split(/[,|]/).map(t => t.trim()).filter(Boolean);
    if (tags.length === 0) return '';

    return `
      <div class="preview-tags-container perfil-tags-container">
        ${tags.map(tag => {
          const tClean = tag.startsWith('#') ? tag : `#${tag}`;
          return `<span class="profile-tag-pill perfil-tag-chip">${sanitizarHtmlPerfil(tClean)}</span>`;
        }).join('')}
      </div>
    `;
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

  function abrirModalRecadoCompleto(emoji, textoRecado) {
    const antigo = document.getElementById('perfil-recado-modal');
    if (antigo) antigo.remove();

    const emojiHtml = emoji ? `<span class="recado-emoji-large">${emoji}</span>` : '';
    const textoHtml = textoRecado ? `<p>${sanitizarHtmlPerfil(textoRecado)}</p>` : '<p class="perfil-bio-empty">Sem texto no recado.</p>';

    const modal = document.createElement('div');
    modal.id = 'perfil-recado-modal';
    modal.className = 'perfil-modal-recado-overlay';
    modal.innerHTML = `
      <div class="perfil-modal-recado-card">
        <div class="perfil-modal-recado-header">
          ${emojiHtml}
          <button class="btn-fechar-recado" onclick="this.closest('#perfil-recado-modal').remove()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="perfil-modal-recado-body">
          ${textoHtml}
        </div>
      </div>
    `;

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
  }

  async function compartilharPerfil(usuario) {
    if (!usuario) return;

    const usernameStr = usuario.username || 'usuario';
    const nomeStr = usuario.display_name || usuario.nome || usernameStr;
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?user=${encodeURIComponent(usernameStr)}`;

    const dadosShare = {
      title: `Perfil de ${nomeStr} - Sphere`,
      text: `Confira o perfil de @${usernameStr} no Sphere!`,
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
    if (!userTarget) return;
    const targetId = typeof userTarget === 'object' ? Number(userTarget.id) : Number(userTarget);

    fecharPerfilResetandoHistorico();

    if (typeof global.restaurarChatOcultoSeNecessario === 'function') {
      global.restaurarChatOcultoSeNecessario(targetId);
    }

    if (!document.getElementById('chat-main-container') && typeof global.abrirInterfaceChat === 'function') {
      global.abrirInterfaceChat();
    }

    if (typeof global.alternarAbaNav === 'function') {
      global.alternarAbaNav('chat');
    } else if (typeof global.mudarAba === 'function') {
      global.mudarAba('chat');
    }

    setTimeout(() => {
      if (typeof global.seleccionarConversaDirect === 'function') {
        global.seleccionarConversaDirect(userTarget);
      } else if (typeof global.enviarMensagemParaUsuario === 'function') {
        global.enviarMensagemParaUsuario(userTarget);
      } else if (typeof global.abrirChatComUsuario === 'function') {
        global.abrirChatComUsuario(userTarget);
      } else if (typeof global.cliqueItemContato === 'function') {
        global.cliqueItemContato(targetId);
      }
    }, 100);
  }

  function cancelarInscricaoRealtimePerfil() {
    const sb = global.supabaseClient || global.supabase || global.sb;
    if (canalRealtimePerfil && sb) {
      try {
        sb.removeChannel(canalRealtimePerfil);
      } catch (e) {
        console.warn("[Perfil] Erro ao desligar realtime perfil:", e);
      }
      canalRealtimePerfil = null;
    }
  }

  // ========================================================================
  // RENDERIZAÇÃO DE TELA DE PERFIL RESTREITO (BANIDO / DESATIVADO)
  // ========================================================================
  function renderizarPerfilRestrito(user, tipoRestricao, botaoVoltarOuFechar) {
    const usernameClean = sanitizarHtmlPerfil(user.username || 'usuario');
    const container = document.createElement('div');
    container.id = 'perfil-full-container';
    container.className = 'perfil-full-container perfil-restricted-mode';

    let iconeBanner = 'fa-user-slash';
    let tituloBanner = 'Conta Indisponível';
    let mensagemDesc = 'Este perfil não está acessível no momento.';

    if (tipoRestricao === 'desativada') {
      iconeBanner = 'fa-user-clock';
      tituloBanner = 'Conta Desativada';
      mensagemDesc = `@${usernameClean} desativou sua conta temporariamente.`;
    } else if (tipoRestricao === 'banida' || tipoRestricao === 'suspensa') {
      iconeBanner = 'fa-user-xmark';
      tituloBanner = 'Conta Banida / Suspensa';
      mensagemDesc = `@${usernameClean} foi banido por violar as diretrizes da comunidade.`;
    }

    container.innerHTML = `
      <div class="perfil-content-wrapper profile-card-preview-wrapper restricted-card" onclick="event.stopPropagation();">
        ${botaoVoltarOuFechar}

        <div class="perfil-banner profile-preview-banner restricted-banner">
          <div class="perfil-banner-overlay"></div>
        </div>

        <div class="perfil-restricted-body">
          <div class="restricted-icon-box">
            <i class="fa-solid ${iconeBanner}"></i>
          </div>
          <h3>${tituloBanner}</h3>
          <p>${mensagemDesc}</p>
          <div class="restricted-handle">@${usernameClean}</div>
        </div>
      </div>
    `;

    container.addEventListener('click', voltarOuFecharPerfil);
    return container;
  }

  // ========================================================================
  // ABERTURA E RENDERIZAÇÃO COMPLETA DO PERFIL
  // ========================================================================
  
  async function abrirPerfil(usuarioInput, ehVoltar = false) {
    const logadoRaw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
    const logado = logadoRaw ? JSON.parse(logadoRaw) : null;

    let user = usuarioInput || logado;
    if (!user || user.id === undefined) return;

    const meuId = obterMeuIdLogado();
    const idAlvoNum = Number(user.id);
    const ehMeuPerfil = meuId !== null && meuId === idAlvoNum;

    if (!ehVoltar && global._perfilUsuarioCache) {
      const idAtualCache = Number(global._perfilUsuarioCache.id);
      
      if (idAtualCache !== idAlvoNum) {
        const ultimoNoHistorico = historicoPerfis[historicoPerfis.length - 1];
        if (!ultimoNoHistorico || Number(ultimoNoHistorico.id) !== idAtualCache) {
          historicoPerfis.push(global._perfilUsuarioCache);
        }
      }
    }

    cancelarInscricaoRealtimePerfil();

    const containerExistente = document.getElementById('perfil-full-container');
    if (containerExistente) containerExistente.remove();

    if (typeof global.ocultarHomeCard === 'function') {
      global.ocultarHomeCard();
    }

    global._perfilUsuarioCache = user;

    // Sincronização em tempo real via Supabase CDC
    const sb = global.supabaseClient || global.supabase || global.sb;
    if (sb && idAlvoNum) {
      try {
        const { data } = await sb.from('usuarios').select('*').eq('id', idAlvoNum).single();
        if (data) {
          user = { ...user, ...data };
          global._perfilUsuarioCache = user;
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
              global._perfilUsuarioCache = { ...global._perfilUsuarioCache, ...payload.new };
              if (ehMeuPerfil) {
                localStorage.setItem('usuario_logado', JSON.stringify(global._perfilUsuarioCache));
              }
              abrirPerfil(global._perfilUsuarioCache, true);
            }
          })
          .subscribe();

      } catch (err) {
        console.warn("[Perfil] Sincronização remota pendente:", err);
      }
    }

    const temHistorico = historicoPerfis.length > 0;
    let botaoVoltarOuFechar = '';

    if (ehMeuPerfil) {
      if (temHistorico) {
        botaoVoltarOuFechar = `
          <button class="btn-fechar-perfil" onclick="window.voltarOuFecharPerfil()" title="Voltar ao perfil anterior">
            <i class="fa-solid fa-arrow-left"></i>
          </button>`;
      }
    } else {
      const iconeBotaoTop = temHistorico ? 'fa-arrow-left' : 'fa-xmark';
      const titleBotaoTop = temHistorico ? 'Voltar para o perfil anterior' : 'Fechar Perfil';
      botaoVoltarOuFechar = `
        <button class="btn-fechar-perfil" onclick="window.voltarOuFecharPerfil()" title="${titleBotaoTop}">
          <i class="fa-solid ${iconeBotaoTop}"></i>
        </button>`;
    }

    // VERIFICAÇÃO DE PERFIL BLOQUEADO / DESATIVADO / BANIDO
    const estaBanido = Boolean(user.is_banned) || user.status_conta === 'banida' || user.status_conta === 'suspensa';
    const estaDesativado = user.status_conta === 'desativada';

    if (!ehMeuPerfil && (estaBanido || estaDesativado)) {
      const tipoRestricao = estaBanido ? 'banida' : 'desativada';
      const containerBloqueado = renderizarPerfilRestrito(user, tipoRestricao, botaoVoltarOuFechar);
      document.body.appendChild(containerBloqueado);

      document.removeEventListener('keydown', tratarEscPerfil);
      document.addEventListener('keydown', tratarEscPerfil);
      return;
    }

    const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(user.username || 'user')}`;
    const avatarSrc = (user.avatar_url && user.avatar_url.trim() !== '') ? user.avatar_url : defaultAvatar;
    const molduraSrc = (user.moldura_url && user.moldura_url.trim() !== '') ? user.moldura_url : null;

    const defaultBanner = 'linear-gradient(135deg, #ff2d55, #6c5ce7)';
    const bannerStyle = (user.banner_url && user.banner_url.trim() !== '')
      ? `background-image: url('${user.banner_url}');`
      : `background: ${defaultBanner};`;

    const wallpaperStyle = (user.wallpaper_url && user.wallpaper_url.trim() !== '')
      ? `background-image: url('${user.wallpaper_url}');`
      : '';

    // Cores de Tema Dinâmicas do Usuário (cor_bg1, cor_bg2, cor_tema)
    const corBg1 = user.cor_bg1 || user.cor_tema || '#ff2d55';
    const corBg2 = user.cor_bg2 || user.cor_tema || '#ff7675';
    const corGradient = corBg1 !== corBg2 ? `linear-gradient(135deg, ${corBg1}, ${corBg2})` : corBg1;

    const eCriador = Boolean(user.is_creator || user.is_criador);
    const nomeExibicao = user.display_name || user.nome || user.username || 'Usuário';
    const dataMembroTexto = formatarDataMembroDesde(user);
    const tempoDeContaTexto = calcularTempoDeConta(user);
    
    // Obtém label do status via status.js ou fallback
    const infoStatus = (typeof global.obterInfoStatus === 'function') 
      ? global.obterInfoStatus(user.status) 
      : { label: user.status || 'Offline', classe: user.status || 'offline' };

    // Ponto de status sincronizado
    let statusDotHtml = '';
    if (typeof global.obterHtmlStatusDot === 'function') {
      statusDotHtml = global.obterHtmlStatusDot(user.status || 'offline', user.id);
    } else {
      statusDotHtml = `<span class="status-dot ${infoStatus.classe}" data-user-status-id="${user.id}"></span>`;
    }

    // Recado / Status Customizado
    const emojiStatus = user.status_emoji ? user.status_emoji.trim() : '';
    const textoRecado = user.custom_status ? user.custom_status.trim() : '';

    let customStatusHtml = '';
    if (emojiStatus || textoRecado) {
      const emojiSpan = emojiStatus ? `<span class="emoji">${emojiStatus}</span>` : '';
      const textoSpan = textoRecado ? `<span class="text">${sanitizarHtmlPerfil(textoRecado)}</span>` : '';

      customStatusHtml = `
        <div class="preview-status-bubble" title="Clique para ver o recado completo" onclick="window.abrirModalRecadoCompleto('${emojiStatus}', '${sanitizarHtmlPerfil(textoRecado)}')">
          ${emojiSpan}
          ${textoSpan}
        </div>`;
    }

    const htmlVerificados = renderizarBadgesVerificados(user);
    const htmlTags = renderizarTagsPerfil(user.tags);

    const sobreMimTexto = (user.sobre && user.sobre.trim() !== '')
      ? sanitizarHtmlPerfil(user.sobre)
      : 'Sua biografia aparecerá aqui...';

    // Grupo de Ações Sociais
    let htmlAcoesSociaisAbaixo = '';
    if (ehMeuPerfil) {
      htmlAcoesSociaisAbaixo = `
        <div class="perfil-social-actions-group">
          <button class="btn-perfil-action btn-editar-perfil-main" onclick="if(typeof window.abrirModalEditarPerfil === 'function') window.abrirModalEditarPerfil();">
            <i class="fa-solid fa-pen-to-square"></i> Editar Perfil
          </button>
        </div>`;
    } else {
      htmlAcoesSociaisAbaixo = `
        <div class="perfil-social-actions-group">
          <button id="btn-perfil-mensagem" class="btn-perfil-action btn-mensagem" onclick="window.enviarMensagemParaUsuario(window._perfilUsuarioCache)">
            <i class="fa-solid fa-paper-plane"></i> Mensagem
          </button>
          <button id="btn-perfil-seguir" class="btn-perfil-action btn-seguir" onclick="window.executarAcaoSeguir(${idAlvoNum})">
            <i class="fa-solid fa-user-plus"></i> Seguir
          </button>
          <button id="btn-perfil-amizade" class="btn-perfil-action btn-amigo" onclick="window.executarAcaoAmizade(${idAlvoNum})">
            <i class="fa-solid fa-handshake"></i> Adicionar
          </button>
        </div>`;
    }

    const container = document.createElement('div');
    container.id = 'perfil-full-container';
    container.className = `perfil-full-container ${eCriador ? 'is-creator' : ''}`;

    container.innerHTML = `
      <div class="perfil-content-wrapper profile-card-preview-wrapper" style="${wallpaperStyle} --user-theme-color: ${corBg1}; --user-theme-gradient: ${corGradient}; --user-theme-glow: ${corBg1}40; --user-theme-border: ${corBg1}35;" onclick="event.stopPropagation();">
        ${botaoVoltarOuFechar}

        <div class="perfil-banner profile-preview-banner" style="${bannerStyle}">
          <div class="perfil-banner-overlay"></div>
        </div>
        
        <div class="perfil-header profile-preview-header">
          <div class="perfil-avatar-wrapper profile-preview-avatar-box">
            <img src="${avatarSrc}" class="perfil-avatar preview-avatar" onerror="this.onerror=null; this.src='${defaultAvatar}';" alt="Avatar">
            ${molduraSrc ? `<img src="${molduraSrc}" class="perfil-moldura preview-moldura" alt="Moldura">` : ''}
            <div class="avatar-status-badge">
              ${statusDotHtml}
            </div>
          </div>
          
          <div class="perfil-names-container profile-preview-main-info">
            <div class="perfil-display-row">
              <span class="perfil-display-name">${sanitizarHtmlPerfil(nomeExibicao)}</span>
            </div>
            
            <div class="perfil-handle-row">
              <span class="perfil-handle-username preview-username" onclick="window.copiarHandleUsuario('@${sanitizarHtmlPerfil(user.username || 'usuario')}')" title="Clique para copiar @username">
                @${sanitizarHtmlPerfil(user.username || 'usuario')} <i class="fa-regular fa-copy copy-icon"></i>
              </span>
              <button class="btn-compartilhar-perfil" onclick="window.compartilharPerfil(window._perfilUsuarioCache)" title="Compartilhar Perfil">
                <i class="fa-solid fa-share-nodes"></i>
              </button>
            </div>

            <div class="preview-badge-row">
              ${htmlVerificados}
            </div>
          </div>

          ${htmlAcoesSociaisAbaixo}

          <div class="profile-preview-details">
            ${customStatusHtml}

            <div class="preview-meta-grid">
              <span><i class="fa-solid fa-cake-candles"></i> <strong>${calcularIdadeFormatada(user.data_nascimento)}</strong></span>
              <span><i class="fa-solid fa-venus-mars"></i> <strong>${sanitizarHtmlPerfil(user.genero || 'Gênero não informado')}</strong> (${sanitizarHtmlPerfil(user.pronome || 'Pronomes')})</span>
            </div>

            <div class="perfil-meta-info preview-meta-grid" style="margin-top: 4px;">
              <div class="perfil-meta-item clickable" onclick="window.copiarIdUsuario('${user.id || ''}')" title="Clique para copiar ID">
                <i class="fa-solid fa-hashtag"></i> ID: ${user.id || 'N/A'}
              </div>
              <div class="perfil-meta-item" title="${tempoDeContaTexto}">
                <i class="fa-solid fa-calendar-days"></i> Membro desde: ${dataMembroTexto}
              </div>
              <div class="perfil-meta-item" title="Estado de Presença">
                Presença: <strong class="status-label-text">${infoStatus.label}</strong>
              </div>
            </div>

            <div class="perfil-stats-bar">
              <div class="stat-item" onclick="if(typeof window.abrirListaSocial === 'function') window.abrirListaSocial(${idAlvoNum}, 'amigos')">
                <span class="stat-value" id="perfil-total-amigos">${formatarNumeroMetrica(user.total_amigos)}</span>
                <span class="stat-label">Amigos</span>
              </div>
              <div class="stat-item" onclick="if(typeof window.abrirListaSocial === 'function') window.abrirListaSocial(${idAlvoNum}, 'seguindo')">
                <span class="stat-value" id="perfil-total-seguindo">${formatarNumeroMetrica(user.total_seguindo)}</span>
                <span class="stat-label">Seguindo</span>
              </div>
              <div class="stat-item" onclick="if(typeof window.abrirListaSocial === 'function') window.abrirListaSocial(${idAlvoNum}, 'seguidores')">
                <span class="stat-value" id="perfil-total-seguidores">${formatarNumeroMetrica(user.total_seguidores)}</span>
                <span class="stat-label">Seguidores</span>
              </div>
            </div>

            <p class="preview-bio perfil-bio-text">${sobreMimTexto}</p>

            ${htmlTags}
          </div>

        </div>
      </div>
    `;

    container.addEventListener('click', voltarOuFecharPerfil);
    document.body.appendChild(container);

    document.removeEventListener('keydown', tratarEscPerfil);
    document.addEventListener('keydown', tratarEscPerfil);

    await carregarMetricasESocialPerfil(idAlvoNum, ehMeuPerfil);
  }

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
      const idCache = global._perfilUsuarioCache ? Number(global._perfilUsuarioCache.id) : null;
      
      if (meuId !== null && meuId === idCache && historicoPerfis.length === 0) {
        return;
      }
      voltarOuFecharPerfil();
    }
  }

  function fecharPerfilResetandoHistorico() {
    cancelarInscricaoRealtimePerfil();
    historicoPerfis = [];
    global._perfilUsuarioCache = null;

    const container = document.getElementById('perfil-full-container');
    if (container) container.remove();
    document.removeEventListener('keydown', tratarEscPerfil);

    if (typeof global.exibirHomeCard === 'function') {
      global.exibirHomeCard();
    }
  }

  async function carregarMetricasESocialPerfil(idAlvo, ehMeuPerfil) {
    if (typeof global.obterStatusRelacionamentoESocial !== 'function') return;

    try {
      const dados = await global.obterStatusRelacionamentoESocial(idAlvo);
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

    if (typeof global.alternarSeguir === 'function') {
      const res = await global.alternarSeguir(idAlvo);
      if (res && res.sucesso) {
        await carregarMetricasESocialPerfil(idAlvo, false);
      }
    }

    if (btn) btn.disabled = false;
  }

  async function executarAcaoAmizade(idAlvo) {
    const btn = document.getElementById('btn-perfil-amizade');
    if (btn) btn.disabled = true;

    if (typeof global.alternarSolicitacaoAmizade === 'function') {
      const res = await global.alternarSolicitacaoAmizade(idAlvo);
      if (res && res.sucesso) {
        await carregarMetricasESocialPerfil(idAlvo, false);
      }
    }

    if (btn) btn.disabled = false;
  }

  async function verificarDeeplinkPerfilURL() {
    const params = new URLSearchParams(window.location.search);
    const targetUser = params.get('user');
    const targetId = params.get('id');

    if (!targetUser && !targetId) return;

    const sb = global.supabaseClient || global.supabase || global.sb;
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
  global.abrirPerfil = abrirPerfil;
  global.fecharPerfil = fecharPerfilResetandoHistorico;
  global.voltarOuFecharPerfil = voltarOuFecharPerfil;
  global.compartilharPerfil = compartilharPerfil;
  global.abrirModalRecadoCompleto = abrirModalRecadoCompleto;
  global.executarAcaoSeguir = executarAcaoSeguir;
  global.executarAcaoAmizade = executarAcaoAmizade;
  global.enviarMensagemParaUsuario = enviarMensagemParaUsuario;
  global.copiarHandleUsuario = (handle) => copiarParaAreaTransferencia(handle, 'Nome de usuário');
  global.copiarIdUsuario = (id) => copiarParaAreaTransferencia(id, 'ID do usuário');

})(typeof window !== 'undefined' ? window : this);
