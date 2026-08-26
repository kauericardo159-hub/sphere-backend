// ==========================================================================
// EMOJI SYSTEM & PARSER (emojis.js) - ESTILO DISCORD 2D
// ==========================================================================

(function () {
  // 1. Injeção Dinâmica dos Estilos CSS
  if (!document.getElementById('discord-emojis-styles')) {
    const cssStyles = `
      .discord-emoji {
        display: inline-block;
        width: 1.35em;
        height: 1.35em;
        vertical-align: -0.25em;
        object-fit: contain;
        user-select: none;
        transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      .discord-emoji:hover {
        transform: scale(1.25);
      }

      .discord-emoji.jumboji {
        width: 2.8em;
        height: 2.8em;
        vertical-align: middle;
        margin: 4px 2px;
      }

      .emoji-picker-modal {
        position: absolute;
        bottom: 65px;
        left: 14px;
        width: 330px;
        height: 390px;
        background: #180c1b;
        border: 1px solid rgba(255, 45, 85, 0.35);
        border-radius: 16px;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.9);
        display: flex;
        flex-direction: column;
        z-index: 2600;
        overflow: hidden;
        animation: emojiPickerFadeIn 0.2s ease-out;
      }

      @keyframes emojiPickerFadeIn {
        from { opacity: 0; transform: translateY(10px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      .emoji-picker-header {
        padding: 10px 12px;
        background: rgba(22, 13, 25, 0.95);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .emoji-picker-search {
        width: 100%;
        background: rgba(15, 8, 18, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 20px;
        padding: 8px 14px;
        color: #fff;
        font-size: 0.82rem;
        outline: none;
        box-sizing: border-box;
      }

      .emoji-picker-search:focus {
        border-color: #ff2d55;
      }

      .emoji-picker-body {
        flex: 1;
        overflow-y: auto;
        padding: 10px;
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 6px;
        align-content: start;
      }

      .emoji-picker-body::-webkit-scrollbar {
        width: 5px;
      }

      .emoji-picker-body::-webkit-scrollbar-thumb {
        background: rgba(255, 45, 85, 0.4);
        border-radius: 10px;
      }

      .emoji-item-btn {
        background: transparent;
        border: none;
        padding: 6px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s, transform 0.15s;
      }

      .emoji-item-btn:hover {
        background: rgba(255, 45, 85, 0.25);
        transform: scale(1.2);
      }

      .emoji-item-btn img {
        width: 24px;
        height: 24px;
        pointer-events: none;
      }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = 'discord-emojis-styles';
    styleEl.innerHTML = cssStyles;
    document.head.appendChild(styleEl);
  }

  // 2. Lista Abrangente de Emojis
  const EMOJI_DATABASE = [
    // Rostos & Expressões
    { char: '😀', name: 'sorriso rindo feliz' }, { char: '😃', name: 'sorriso olhos abertos' },
    { char: '😄', name: 'sorriso fechado' }, { char: '😁', name: 'sorriso dentes' },
    { char: '😆', name: 'gargalhada' }, { char: '😅', name: 'suor frio' },
    { char: '🤣', name: 'rolando de rir' }, { char: '😂', name: 'chorando de rir' },
    { char: '🙂', name: 'sorriso leve' }, { char: '🙃', name: 'de ponta cabeca' },
    { char: '😉', name: 'piscar' }, { char: '😊', name: 'corado' },
    { char: '😇', name: 'anjo inocente' }, { char: '🥰', name: 'apaixonado coracoes' },
    { char: '😍', name: 'olhos coracao' }, { char: '🤩', name: 'estelar' },
    { char: '😘', name: 'beijo' }, { char: '😋', name: 'hmmm delicia' },
    { char: '😛', name: 'lingua' }, { char: '😜', name: 'lingua piscar' },
    { char: '🤪', name: 'louco doido' }, { char: '😝', name: 'lingua fechado' },
    { char: '🤑', name: 'dinheiro cifrao' }, { char: '🤗', name: 'abraço' },
    { char: '🤭', name: 'ops risadinha' }, { char: '🤫', name: 'shhh silencio' },
    { char: '🤔', name: 'pensando' }, { char: '🤐', name: 'boca fechada' },
    { char: '🤨', name: 'desconfiado' }, { char: '😐', name: 'neutro' },
    { char: '😑', name: 'sem expressao' }, { char: '😶', name: 'sem boca' },
    { char: 'smirk', char: '😏', name: 'deboche malicioso' }, { char: '😒', name: 'chateado' },
    { char: '😬', name: 'careta' }, { char: '🤥', name: 'mentiroso' },
    { char: '😌', name: 'aliviado' }, { char: '😔', name: 'triste' },
    { char: '😪', name: 'sono' }, { char: '🤤', name: 'babando' },
    { char: '😴', name: 'dormindo' }, { char: '😷', name: 'mascara' },
    { char: '🤒', name: 'doente' }, { char: '🤕', name: 'machucado' },
    { char: '🤢', name: 'enjoado' }, { char: '🤮', name: 'vomitando' },
    { char: '🤧', name: 'espirro' }, { char: '🥵', name: 'calor fogo' },
    { char: '🥶', name: 'frio gelo' }, { char: '🤯', name: 'cabeca explodindo' },
    { char: '🤠', name: 'cowboy' }, { char: '🥳', name: 'festa celebracao' },
    { char: '😎', name: 'oculos escuros' }, { char: '🤓', name: 'nerd' },
    { char: '🧐', name: 'monoculo' }, { char: '😕', name: 'confuso' },
    { char: '😟', name: 'preocupado' }, { char: '🙁', name: 'triste leve' },
    { char: '😮', name: 'surpreso' }, { char: '😯', name: 'oh' },
    { char: '😲', name: 'assustado' }, { char: '😳', name: 'vergonha' },
    { char: '🥺', name: 'por favor choro' }, { char: '😦', name: 'boca aberta triste' },
    { char: '😧', name: 'angustiado' }, { char: '😨', name: 'medo' },
    { char: '😰', name: 'suor frio azul' }, { char: '😥', name: 'triste alivio' },
    { char: '😢', name: 'chorando gota' }, { char: '😭', name: 'chorando muito' },
    { char: '😱', name: 'grito medo' }, { char: '😖', name: 'sofrimento' },
    { char: '😣', name: 'perseverante' }, { char: '😞', name: 'decepcionado' },
    { char: '😓', name: 'suor gota' }, { char: '😩', name: 'cansado' },
    { char: '😫', name: 'exausto' }, { char: '🥱', name: 'bocejo' },
    { char: '😤', name: 'fumaca nariz' }, { char: '😡', name: 'com raiva vermelho' },
    { char: '😠', name: 'bravo' }, { char: '😈', name: 'diabinho roxo' },
    { char: '👿', name: 'diabo bravo' }, { char: '💀', name: 'caveira cranio' },
    { char: '☠️', name: 'caveira ossos' }, { char: '💩', name: 'coco' },
    { char: '🤡', name: 'palhaco' }, { char: 'ghost', char: '👻', name: 'fantasma' },
    { char: '👽', name: 'alienigena et' }, { char: '🤖', name: 'robo' },

    // Gestos & Mão
    { char: '👋', name: 'aceno tchau' }, { char: '🤚', name: 'costas mao' },
    { char: '🖐️', name: 'mao aberta' }, { char: '✋', name: 'pare mao' },
    { char: '🖖', name: 'spock jornada' }, { char: '👌', name: 'ok perfeito' },
    { char: '🤌', name: 'italiano gesto' }, { char: '🤏', name: 'pouco pequeno' },
    { char: '✌️', name: 'paz vitoria' }, { char: '🤞', name: 'dedos cruzados sorte' },
    { char: '🤟', name: 'te amo rock' }, { char: '🤘', name: 'rock metal' },
    { char: '🤙', name: 'ligar me chama' }, { char: '👈', name: 'esquerda' },
    { char: '👉', name: 'direita' }, { char: '👆', name: 'cima' },
    { char: '🖕', name: 'dedo meio' }, { char: '👇', name: 'baixo' },
    { char: '☝️', name: 'apontar um' }, { char: '👍', name: 'joinha positivo' },
    { char: '👎', name: 'desjoinha negativo' }, { char: '✊', name: 'punho erguido' },
    { char: '👊', name: 'soco proa' }, { char: '🤛', name: 'soco esquerda' },
    { char: '🤜', name: 'soco direita' }, { char: '👏', name: 'palmas' },
    { char: '🙌', name: 'maos alto celebracao' }, { char: '👐', name: 'maos abertas' },
    { char: '🤲', name: 'palmas unidas' }, { char: '🤝', name: 'aperto mao negocio' },
    { char: '🙏', name: 'oracao rezar por favor' }, { char: '✍️', name: 'escrevendo' },
    { char: '💪', name: 'musculo forca' },

    // Corações & Símbolos
    { char: '❤️', name: 'coracao vermelho' }, { char: '🧡', name: 'coracao laranja' },
    { char: '💛', name: 'coracao amarelo' }, { char: '💚', name: 'coracao verde' },
    { char: '💙', name: 'coracao azul' }, { char: '💜', name: 'coracao roxo' },
    { char: '🖤', name: 'coracao preto' }, { char: '🤍', name: 'coracao branco' },
    { char: '🤎', name: 'coracao marrom' }, { char: '💔', name: 'coracao partido' },
    { char: '❣️', name: 'coracao exclamacao' }, { char: '💕', name: 'dois coracoes' },
    { char: '💞', name: 'coracoes girando' }, { char: '💓', name: 'coracao batendo' },
    { char: '💗', name: 'coracao crescendo' }, { char: '💖', name: 'coracao brilhante' },
    { char: '💘', name: 'cupido flecha' }, { char: '💝', name: 'coracao fita' },
    { char: '🔥', name: 'fogo chama' }, { char: '✨', name: 'brilhos estrelas' },
    { char: '⭐', name: 'estrela' }, { char: '🌟', name: 'estrela brilhante' },
    { char: '💥', name: 'colisao boom' }, { char: '💯', name: 'cem cem' },
    { char: '💢', name: 'raiva simbolo' }, { char: '💦', name: 'pingos agua' },
    { char: '💨', name: 'vento rapido' }, { char: '🎉', name: 'festa confete' },
    { char: '🎊', name: 'festa bola' }, { char: '🎁', name: 'presente' }
  ];

  // Helper para converter caractere unicode para URL Twemoji SVG
  function obterUrlTwemoji(emojiChar) {
    let codePoint = [];
    for (let i = 0; i < emojiChar.length; i++) {
      let code = emojiChar.codePointAt(i);
      if (code !== 0xfe0f) {
        codePoint.push(code.toString(16));
      }
      if (emojiChar.charCodeAt(i) !== emojiChar.codePointAt(i)) {
        i++;
      }
    }
    const hex = codePoint.join('-');
    return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${hex}.svg`;
  }

  // Parser com Expressão Regular para Emojis Unicode
  function converterEmojisDiscord(texto) {
    if (!texto) return '';

    // Regex Unicode para capturar emojis
    const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|\p{Extended_Pictographic})/gu;

    const textoLimpo = texto.replace(emojiRegex, '').trim();
    const matches = texto.match(emojiRegex) || [];
    const eApenasEmojis = textoLimpo.length === 0 && matches.length <= 3;

    return texto.replace(emojiRegex, (match) => {
      const url = obterUrlTwemoji(match);
      const classeJumbo = eApenasEmojis ? 'jumboji' : '';
      return `<img src="${url}" class="discord-emoji ${classeJumbo}" alt="${match}" draggable="false" onerror="this.outerHTML='${match}'" />`;
    });
  }

  // Interface do Seletor de Emojis
  function alternarSeletorEmojis(alvoInputId) {
    let picker = document.getElementById('discord-emoji-picker');

    if (picker) {
      picker.remove();
      return;
    }

    const input = document.getElementById(alvoInputId);
    if (!input) return;

    picker = document.createElement('div');
    picker.id = 'discord-emoji-picker';
    picker.className = 'emoji-picker-modal';

    picker.innerHTML = `
      <div class="emoji-picker-header">
        <input type="text" class="emoji-picker-search" placeholder="Buscar emoji..." oninput="DiscordEmojiSystem.filtrarEmojis(this.value, '${alvoInputId}')">
      </div>
      <div class="emoji-picker-body" id="emoji-picker-grid"></div>
    `;

    document.body.appendChild(picker);

    const inputContainer = input.closest('.chat-input-container') || input.parentElement;
    if (inputContainer) {
      const rect = inputContainer.getBoundingClientRect();
      picker.style.left = `${Math.max(14, rect.left)}px`;
      picker.style.bottom = `${window.innerHeight - rect.top + 10}px`;
    }

    renderizarGridPicker(EMOJI_DATABASE, input);

    const fecharFora = (e) => {
      if (!picker.contains(e.target) && !e.target.closest('#btn-chat-emoji-toggle') && !e.target.closest('.chat-btn-emoji')) {
        picker.remove();
        document.removeEventListener('click', fecharFora);
      }
    };
    setTimeout(() => document.addEventListener('click', fecharFora), 10);
  }

  function renderizarGridPicker(lista, inputTarget) {
    const grid = document.getElementById('emoji-picker-grid');
    if (!grid) return;

    grid.innerHTML = lista.map(item => `
      <button class="emoji-item-btn" title="${item.name}" onclick="DiscordEmojiSystem.inserirEmoji('${item.char}', '${inputTarget.id}')">
        <img src="${obterUrlTwemoji(item.char)}" alt="${item.char}" loading="lazy">
      </button>
    `).join('');
  }

  function filtrarEmojis(termo, inputId) {
    const t = termo.toLowerCase().trim();
    const input = document.getElementById(inputId || 'chat-text-input');
    const filtrados = EMOJI_DATABASE.filter(e => e.name.includes(t) || e.char === t);
    renderizarGridPicker(filtrados, input);
  }

  function inserirEmoji(emojiChar, inputId) {
    const input = document.getElementById(inputId);
    if (input) {
      const start = input.selectionStart || input.value.length;
      const end = input.selectionEnd || input.value.length;
      
      input.value = input.value.substring(0, start) + emojiChar + input.value.substring(end);
      input.selectionStart = input.selectionEnd = start + emojiChar.length;
      input.focus();

      if (typeof window.tratarInputTexto === 'function') {
        window.tratarInputTexto(input);
      }
    }
  }

  // Exportações Globais
  window.DiscordEmojiSystem = {
    converter: converterEmojisDiscord,
    alternarSeletor: alternarSeletorEmojis,
    filtrarEmojis: filtrarEmojis,
    inserirEmoji: inserirEmoji,
    obterUrlTwemoji: obterUrlTwemoji
  };

})();
