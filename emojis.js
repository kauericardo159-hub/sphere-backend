// ==========================================================================
// EMOJI KEYBOARD & REACTION SYSTEM (emojis.js) - SPHERE V5.0
// Universal Categorized Keyboard, Native Emoji Database & Reaction Support
// ==========================================================================

(function () {
  let eModoReacaoAtual = false;
  let categoriaAtivaAtual = 'smileys';

  // 1. Injeção Dinâmica dos Estilos CSS do Teclado Glassmorphism
  if (!document.getElementById('discord-emojis-styles')) {
    const cssStyles = `
      .discord-emoji {
        display: inline-block;
        width: 1.15em;
        height: 1.15em;
        vertical-align: -0.15em;
        object-fit: contain;
        user-select: none;
        transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        margin: 0 1px;
      }

      .discord-emoji:hover {
        transform: scale(1.15);
      }

      /* Jumboji Reduzido e Proporcional */
      .discord-emoji.jumboji {
        width: 1.6em;
        height: 1.6em;
        vertical-align: -0.2em;
        margin: 2px 1px;
      }

      /* Seletor Estilo Teclado */
      .emoji-picker-modal {
        position: absolute;
        bottom: 65px;
        left: 14px;
        width: 320px;
        height: 380px;
        background: #180c1b;
        border: 1px solid rgba(255, 45, 85, 0.35);
        border-radius: 18px;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.95);
        display: flex;
        flex-direction: column;
        z-index: 3600;
        overflow: hidden;
        animation: emojiPickerFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes emojiPickerFadeIn {
        from { opacity: 0; transform: translateY(12px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      .emoji-picker-header {
        padding: 8px 10px;
        background: rgba(22, 13, 25, 0.95);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .emoji-picker-search {
        width: 100%;
        height: 32px;
        background: rgba(15, 8, 18, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        padding: 0 12px;
        color: #fff;
        font-size: 0.8rem;
        outline: none;
        box-sizing: border-box;
      }

      .emoji-picker-search:focus {
        border-color: #ff2d55;
      }

      /* Categorias do Teclado */
      .emoji-categories-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 6px;
        background: rgba(10, 5, 12, 0.5);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .emoji-cat-btn {
        background: transparent;
        border: none;
        color: #8e7f96;
        font-size: 0.95rem;
        padding: 6px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1;
      }

      .emoji-cat-btn:hover, .emoji-cat-btn.active {
        color: #ff2d55;
        background: rgba(255, 45, 85, 0.15);
      }

      .emoji-picker-body {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
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
        padding: 4px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s, transform 0.15s;
      }

      .emoji-item-btn:hover {
        background: rgba(255, 45, 85, 0.25);
        transform: scale(1.18);
      }

      .emoji-item-btn img {
        width: 22px;
        height: 22px;
        pointer-events: none;
      }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = 'discord-emojis-styles';
    styleEl.innerHTML = cssStyles;
    document.head.appendChild(styleEl);
  }

  // 2. Base Completa de Emojis Organizada por Categorias
  const EMOJI_CATEGORIES = {
    smileys: [
      { char: '😀', name: 'sorriso' }, { char: '😃', name: 'feliz' }, { char: '😄', name: 'sorridente' },
      { char: '😁', name: 'dentes' }, { char: '😆', name: 'gargalhada' }, { char: '😅', name: 'suor frio' },
      { char: '🤣', name: 'rolando de rir' }, { char: '😂', name: 'chorando de rir' }, { char: '🙂', name: 'leve' },
      { char: '🙃', name: 'inverso' }, { char: '😉', name: 'piscar' }, { char: '😊', name: 'corado' },
      { char: '😇', name: 'anjo' }, { char: '🥰', name: 'coracoes' }, { char: '😍', name: 'apaixonado' },
      { char: '🤩', name: 'estelar' }, { char: '😘', name: 'beijo' }, { char: '😋', name: 'delicia' },
      { char: '😛', name: 'lingua' }, { char: '😜', name: 'lingua piscar' }, { char: '🤪', name: 'doido' },
      { char: '😝', name: 'lingua fechado' }, { char: '🤑', name: 'dinheiro' }, { char: '🤗', name: 'abraço' },
      { char: '🤭', name: 'ops' }, { char: '🤫', name: 'silencio' }, { char: '🤔', name: 'pensando' },
      { char: '🤐', name: 'ziper' }, { char: '🤨', name: 'desconfiado' }, { char: '😐', name: 'neutro' },
      { char: '😑', name: 'sem expressao' }, { char: '😶', name: 'sem boca' }, { char: '😏', name: 'deboche' },
      { char: '😒', name: 'chateado' }, { char: '😬', name: 'careta' }, { char: '🤥', name: 'mentira' },
      { char: '😌', name: 'aliviado' }, { char: '😔', name: 'triste' }, { char: '😪', name: 'sono' },
      { char: '🤤', name: 'babando' }, { char: '😴', name: 'dormindo' }, { char: '😷', name: 'mascara' },
      { char: '🤒', name: 'doente' }, { char: '🤕', name: 'machucado' }, { char: '🤢', name: 'enjoado' },
      { char: '🤮', name: 'vomito' }, { char: '🤧', name: 'espirro' }, { char: '🥵', name: 'calor' },
      { char: '🥶', name: 'frio' }, { char: '🤯', name: 'explodindo' }, { char: '🤠', name: 'cowboy' },
      { char: '🥳', name: 'festa' }, { char: '😎', name: 'oculos' }, { char: '🤓', name: 'nerd' },
      { char: '🧐', name: 'monoculo' }, { char: '😕', name: 'confuso' }, { char: '😟', name: 'preocupado' },
      { char: '😮', name: 'surpreso' }, { char: '😯', name: 'oh' }, { char: '😲', name: 'assustado' },
      { char: '😳', name: 'vergonha' }, { char: '🥺', name: 'pedindo' }, { char: '😦', name: 'triste' },
      { char: '😧', name: 'angustia' }, { char: '😨', name: 'medo' }, { char: '😰', name: 'suor azul' },
      { char: '😢', name: 'choro' }, { char: '😭', name: 'chorando muito' }, { char: '😱', name: 'grito' },
      { char: '😖', name: 'sofrimento' }, { char: '😣', name: 'perseverar' }, { char: '😞', name: 'decepcao' },
      { char: '😓', name: 'suor' }, { char: '😩', name: 'cansado' }, { char: '😫', name: 'exausto' },
      { char: '🥱', name: 'bocejo' }, { char: '😤', name: 'raiva fumaca' }, { char: '😡', name: 'raiva' },
      { char: '😠', name: 'bravo' }, { char: '😈', name: 'diabinho' }, { char: '👿', name: 'diabo' },
      { char: '💀', name: 'caveira' }, { char: '☠️', name: 'caveira ossos' }, { char: '💩', name: 'coco' },
      { char: '🤡', name: 'palhaco' }, { char: '👻', name: 'fantasma' }, { char: '👽', name: 'et' }, { char: '🤖', name: 'robo' }
    ],
    gestures: [
      { char: '👋', name: 'tchau' }, { char: '🤚', name: 'costas' }, { char: '🖐️', name: 'mao aberta' },
      { char: '✋', name: 'pare' }, { char: '🖖', name: 'spock' }, { char: '👌', name: 'ok' },
      { char: '🤌', name: 'italiano' }, { char: '🤏', name: 'pouco' }, { char: '✌️', name: 'vitoria' },
      { char: '🤞', name: 'sorte' }, { char: '🤟', name: 'te amo' }, { char: '🤘', name: 'rock' },
      { char: '🤙', name: 'ligar' }, { char: '👈', name: 'esquerda' }, { char: '👉', name: 'direita' },
      { char: '👆', name: 'cima' }, { char: '🖕', name: 'dedo meio' }, { char: '👇', name: 'baixo' },
      { char: '☝️', name: 'apontar' }, { char: '👍', name: 'joinha' }, { char: '👎', name: 'desjoinha' },
      { char: '✊', name: 'punho' }, { char: '👊', name: 'soco' }, { char: '🤛', name: 'soco esqu' },
      { char: '🤜', name: 'soco dir' }, { char: '👏', name: 'palmas' }, { char: '🙌', name: 'maos alto' },
      { char: '👐', name: 'maos abertas' }, { char: '🤲', name: 'oracao' }, { char: '🤝', name: 'aperto' },
      { char: '🙏', name: 'rezar' }, { char: '✍️', name: 'escrever' }, { char: '💪', name: 'forca' }
    ],
    animals: [
      { char: '🐶', name: 'cachorro' }, { char: '🐱', name: 'gato' }, { char: '🐭', name: 'rato' },
      { char: '🐹', name: 'hamster' }, { char: '🐰', name: 'coelho' }, { char: '🦊', name: 'raposa' },
      { char: '🐻', name: 'urso' }, { char: '🐼', name: 'panda' }, { char: 'koala', char: '🐨', name: 'koala' },
      { char: '🐯', name: 'tigre' }, { char: '🦁', name: 'leao' }, { char: '🐮', name: 'vaca' },
      { char: '🐷', name: 'porco' }, { char: 'frog', char: '🐸', name: 'sapo' }, { char: '🐵', name: 'macaco' },
      { char: '🐔', name: 'galinha' }, { char: 'penguin', char: '🐧', name: 'pinguim' }, { char: '🐦', name: 'passaro' },
      { char: '🦅', name: 'aguia' }, { char: 'duck', char: '🦆', name: 'pato' }, { char: 'owl', char: '🦉', name: 'coruja' },
      { char: '🦇', name: 'morcego' }, { char: 'wolf', char: '🐺', name: 'lobo' }, { char: '🦄', name: 'unicornio' },
      { char: '🐝', name: 'abelha' }, { char: '🐛', name: 'lagarta' }, { char: '🦋', name: 'borboleta' }
    ],
    food: [
      { char: '🍏', name: 'maca verde' }, { char: '🍎', name: 'maca' }, { char: '🍐', name: 'pera' },
      { char: '🍊', name: 'laranja' }, { char: '🍋', name: 'limao' }, { char: 'banana', char: '🍌', name: 'banana' },
      { char: 'watermelon', char: '🍉', name: 'melancia' }, { char: 'grape', char: '🍇', name: 'uva' }, { char: 'strawberry', char: '🍓', name: 'morango' },
      { char: 'cherries', char: '🍒', name: 'cereja' }, { char: 'peach', char: '🍑', name: 'pessego' }, { char: 'pineapple', char: '🍍', name: 'abacaxi' },
      { char: 'coconut', char: '🥥', name: 'coco' }, { char: 'kiwi', char: '🥝', name: 'kiwi' }, { char: 'tomato', char: '🍅', name: 'tomate' },
      { char: 'avocado', char: '🥑', name: 'abacate' }, { char: 'eggplant', char: '🍆', name: 'berinjela' }, { char: 'potato', char: '🥔', name: 'batata' },
      { char: 'carrot', char: '🥕', name: 'cenoura' }, { char: 'corn', char: '🌽', name: 'milho' }, { char: 'pizza', char: '🍕', name: 'pizza' },
      { char: 'burger', char: '🍔', name: 'hamburguer' }, { char: 'fries', char: '🍟', name: 'batata frita' }, { char: 'hotdog', char: '🌭', name: 'cachorro quente' },
      { char: 'popcorn', char: '🍿', name: 'pipoca' }, { char: 'coffee', char: '☕', name: 'cafe' }, { char: 'beer', char: '🍺', name: 'cerveja' }
    ],
    activities: [
      { char: '⚽', name: 'futebol' }, { char: '🏀', name: 'basquete' }, { char: '🏈', name: 'futebol americano' },
      { char: '⚾', name: 'beisebol' }, { char: '🥎', name: 'softbol' }, { char: '🎾', name: 'tenis' },
      { char: 'volleyball', char: '🏐', name: 'volei' }, { char: 'rugby', char: '🏉', name: 'rugby' }, { char: 'pingpong', char: '🏓', name: 'ping pong' },
      { char: 'badminton', char: '🏸', name: 'badminton' }, { char: 'boxing', char: '🥊', name: 'boxe' }, { char: 'martial', char: '🥋', name: 'artes marciais' },
      { char: 'trophy', char: '🏆', name: 'trofeu' }, { char: 'medal', char: '🥇', name: 'medalha ouro' }, { char: 'gaming', char: '🎮', name: 'controle videogame' },
      { char: 'dice', char: '🎲', name: 'dado' }, { char: 'chess', char: '♟️', name: 'xadrez' }, { char: 'bowling', char: '🎳', name: 'boliche' }
    ],
    symbols: [
      { char: '❤️', name: 'coracao vermelho' }, { char: '🧡', name: 'coracao laranja' }, { char: '💛', name: 'coracao amarelo' },
      { char: '💚', name: 'coracao verde' }, { char: '💙', name: 'coracao azul' }, { char: '💜', name: 'coracao roxo' },
      { char: '🖤', name: 'coracao preto' }, { char: '🤍', name: 'coracao branco' }, { char: '🤎', name: 'coracao marrom' },
      { char: '💔', name: 'coracao partido' }, { char: '❣️', name: 'exclamacao' }, { char: '💕', name: 'dois coracoes' },
      { char: '💞', name: 'girando' }, { char: '💓', name: 'batendo' }, { char: '💗', name: 'crescendo' },
      { char: '💖', name: 'brilhante' }, { char: '💘', name: 'cupido' }, { char: '💝', name: 'fita' },
      { char: '🔥', name: 'fogo' }, { char: '✨', name: 'brilhos' }, { char: '⭐', name: 'estrela' },
      { char: '🌟', name: 'estrela brilhante' }, { char: '💥', name: 'boom' }, { char: '💯', name: 'cem' },
      { char: '💢', name: 'raiva' }, { char: '💦', name: 'agua' }, { char: '💨', name: 'vento' },
      { char: '🎉', name: 'festa confete' }, { char: '🎊', name: 'festa bola' }, { char: '🎁', name: 'presente' }
    ]
  };

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

  // Parser com Expressão Regular para Emojis Unicode no Site Inteiro
  function converterEmojisDiscord(texto) {
    if (!texto) return '';

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

  // Processamento Automático no DOM
  function processarEmojisNoElemento(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const texto = node.nodeValue;
      const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|\p{Extended_Pictographic})/gu;
      
      if (emojiRegex.test(texto) && node.parentNode && !['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA'].includes(node.parentNode.tagName)) {
        const temp = document.createElement('span');
        temp.innerHTML = converterEmojisDiscord(texto);
        node.parentNode.replaceChild(temp, node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (!['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA'].includes(node.tagName) && !node.classList.contains('discord-emoji')) {
        Array.from(node.childNodes).forEach(processarEmojisNoElemento);
      }
    }
  }

  const observerGlobal = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => processarEmojisNoElemento(node));
    });
  });

  document.addEventListener('DOMContentLoaded', () => {
    processarEmojisNoElemento(document.body);
    observerGlobal.observe(document.body, { childList: true, subtree: true });
  });

  // Interface do Seletor Estilo Teclado com Categorias
  function alternarSeletorEmojis(alvoInputId, eModoReacao = false) {
    let picker = document.getElementById('discord-emoji-picker');
    eModoReacaoAtual = eModoReacao;

    if (picker) {
      picker.remove();
      return;
    }

    const input = document.getElementById(alvoInputId);
    if (!input && !eModoReacao) return;

    picker = document.createElement('div');
    picker.id = 'discord-emoji-picker';
    picker.className = 'emoji-picker-modal';

    picker.innerHTML = `
      <div class="emoji-picker-header">
        <input type="text" class="emoji-picker-search" placeholder="${eModoReacao ? 'Buscar reação...' : 'Buscar emoji...'}" oninput="DiscordEmojiSystem.filtrarEmojis(this.value, '${alvoInputId}')">
      </div>
      <div class="emoji-categories-bar">
        <button class="emoji-cat-btn active" onclick="DiscordEmojiSystem.trocarCategoria('smileys', '${alvoInputId}')" title="Smileys"><i class="fa-solid fa-face-smile"></i></button>
        <button class="emoji-cat-btn" onclick="DiscordEmojiSystem.trocarCategoria('gestures', '${alvoInputId}')" title="Gestos"><i class="fa-solid fa-hand-peace"></i></button>
        <button class="emoji-cat-btn" onclick="DiscordEmojiSystem.trocarCategoria('animals', '${alvoInputId}')" title="Animais"><i class="fa-solid fa-cat"></i></button>
        <button class="emoji-cat-btn" onclick="DiscordEmojiSystem.trocarCategoria('food', '${alvoInputId}')" title="Comida"><i class="fa-solid fa-burger"></i></button>
        <button class="emoji-cat-btn" onclick="DiscordEmojiSystem.trocarCategoria('activities', '${alvoInputId}')" title="Esportes"><i class="fa-solid fa-futbol"></i></button>
        <button class="emoji-cat-btn" onclick="DiscordEmojiSystem.trocarCategoria('symbols', '${alvoInputId}')" title="Símbolos"><i class="fa-solid fa-heart"></i></button>
      </div>
      <div class="emoji-picker-body" id="emoji-picker-grid"></div>
    `;

    document.body.appendChild(picker);

    if (input && !eModoReacao) {
      const inputContainer = input.closest('.chat-input-container') || input.parentElement;
      if (inputContainer) {
        const rect = inputContainer.getBoundingClientRect();
        picker.style.left = `${Math.max(14, rect.left)}px`;
        picker.style.bottom = `${window.innerHeight - rect.top + 10}px`;
      }
    } else {
      picker.style.left = '50%';
      picker.style.top = '50%';
      picker.style.transform = 'translate(-50%, -50%)';
      picker.style.bottom = 'auto';
    }

    renderizarGridPicker(EMOJI_CATEGORIES.smileys, alvoInputId);

    const fecharFora = (e) => {
      if (!picker.contains(e.target) && !e.target.closest('#btn-chat-emoji-toggle') && !e.target.closest('.chat-btn-emoji') && !e.target.closest('.btn-more-reactions')) {
        picker.remove();
        document.removeEventListener('click', fecharFora);
      }
    };
    setTimeout(() => document.addEventListener('click', fecharFora), 10);
  }

  function trocarCategoria(catKey, inputId) {
    categoriaAtivaAtual = catKey;
    document.querySelectorAll('.emoji-cat-btn').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');

    const lista = EMOJI_CATEGORIES[catKey] || EMOJI_CATEGORIES.smileys;
    renderizarGridPicker(lista, inputId);
  }

  function renderizarGridPicker(lista, inputId) {
    const grid = document.getElementById('emoji-picker-grid');
    if (!grid) return;

    grid.innerHTML = lista.map(item => `
      <button class="emoji-item-btn" title="${item.name}" onclick="DiscordEmojiSystem.selecionarEmoji('${item.char}', '${inputId}')">
        <img src="${obterUrlTwemoji(item.char)}" alt="${item.char}" loading="lazy">
      </button>
    `).join('');
  }

  function filtrarEmojis(termo, inputId) {
    const t = termo.toLowerCase().trim();
    if (!t) {
      renderizarGridPicker(EMOJI_CATEGORIES[categoriaAtivaAtual], inputId);
      return;
    }

    let todos = [];
    Object.values(EMOJI_CATEGORIES).forEach(arr => { todos = todos.concat(arr); });
    const filtrados = todos.filter(e => e.name.includes(t) || e.char === t);
    renderizarGridPicker(filtrados, inputId);
  }

  // Manipulação Inteligente ao Selecionar Emoji (Texto vs Reação Direta em Mensagem)
  function selecionarEmoji(emojiChar, inputId) {
    if (eModoReacaoAtual) {
      if (typeof window.alternarReacaoMensagem === 'function' && window.mensagemAlvoReacaoDireta) {
        window.alternarReacaoMensagem(window.mensagemAlvoReacaoDireta, emojiChar);
      }
      const picker = document.getElementById('discord-emoji-picker');
      if (picker) picker.remove();
    } else {
      inserirEmojiNoInput(emojiChar, inputId);
    }
  }

  function inserirEmojiNoInput(emojiChar, inputId) {
    const input = document.getElementById(inputId || 'chat-text-input');
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
    trocarCategoria: trocarCategoria,
    filtrarEmojis: filtrarEmojis,
    selecionarEmoji: selecionarEmoji,
    inserirEmoji: inserirEmojiNoInput,
    obterUrlTwemoji: obterUrlTwemoji,
    processarNoElemento: processarEmojisNoElemento
  };

})();
