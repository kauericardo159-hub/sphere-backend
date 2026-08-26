(function() {
    'use strict';

    // Trava de segurança para o modo manutenção
    if (typeof emManutencao !== 'undefined' && emManutencao === true) return;

    // Injeção de regras de comportamento de toque e clique nativos
    const estiloToque = document.createElement('style');
    estiloToque.textContent = `
        /* 1. Extermínio global do flash azul do WebKit (Android/Chrome e iOS/Safari) */
        * {
            -webkit-tap-highlight-color: transparent !important;
            -webkit-tap-highlight-color: rgba(0, 0, 0, 0) !important;
        }

        /* 2. Engenharia de Foco Inteligente (Foco por Clique vs Foco por Teclado) */
        /* Remove a borda cinza/preta padrão quando o elemento é clicado ou tocado */
        *:focus {
            outline: none !important;
            box-shadow: none !important;
        }

        /* Mantém a acessibilidade viva: se o usuário navegar via teclado/leitor, exibe uma borda estilizada */
        *:focus-visible {
            outline: 2px dashed var(--sky-ciano, #00e5ff) !important;
            outline-offset: 4px;
        }

        /* 3. Blindagem de Comportamento PWA (Evita sensação de site web) */
        .card, 
        .perfil-wrapper, 
        .meme-wrapper, 
        img, 
        button {
            /* Impede que o iOS abra aquele menu suspenso nativo ("Salvar Imagem/Copiar") ao segurar o dedo na tela */
            -webkit-touch-callout: none !important;
            
            /* Bloqueia o fantasma de arrasto do navegador (aquela sombra semitransparente ao puxar uma imagem) */
            -webkit-user-drag: none !important;
        }
        
        /* Garante que elementos de texto do card não fiquem selecionados acidentalmente em cliques duplos rápidos */
        .nome, .valor, .label, .card-secundario-titulo {
            user-select: none;
            -webkit-user-select: none;
        }
    `;

    document.head.appendChild(estiloToque);
})();
