import { syntaxColors, currentLanguage } from './config.js';
import { currentFile } from './fileManager.js';

const lineNumbersContainer = document.getElementById('line-numbers');

codeEditor.addEventListener('scroll', () => {
    lineNumbersContainer.scrollTop = codeEditor.scrollTop;
});

// Mise à jour de la coloration syntaxique
function updateCodeHighlighting() {
    const codeEditor = document.getElementById('codeEditor');
    const code = codeEditor.value;

    const preElement = document.createElement('pre');
    preElement.className = currentLanguage === 'python' ? 'language-python' : 'language-javascript';

    const codeElement = document.createElement('code');
    codeElement.className = currentLanguage === 'python' ? 'language-python' : 'language-javascript';
    codeElement.textContent = code;

    preElement.appendChild(codeElement);
    Prism.highlightElement(codeElement);

    let highlightedContent = codeElement.innerHTML;
    if (code.endsWith('\n')) {
        highlightedContent += '<br>';
    }

    const existingLayer = document.querySelector('.highlight-layer');
    if (existingLayer) {
        existingLayer.innerHTML = highlightedContent;
    } else {
        const highlightLayer = document.createElement('div');
        highlightLayer.className = 'highlight-layer';
        highlightLayer.innerHTML = highlightedContent;
        document.querySelector('.editor-container').appendChild(highlightLayer);
    }
}

// Mise à jour des couleurs de syntaxe
function updateSyntaxColors(colors) {
    // Mettre à jour l'objet syntaxColors importé
    Object.assign(syntaxColors, colors);
    localStorage.setItem('syntaxColors', JSON.stringify(colors));

    const style = document.createElement('style');
    style.textContent = `
        .token.keyword { color: ${colors.keywordColor} !important; }
        .token.string { color: ${colors.stringColor} !important; }
        .token.function { color: ${colors.functionColor} !important; }
        .token.number { color: ${colors.numberColor} !important; }
    `;

    const oldStyle = document.getElementById('syntax-colors');
    if (oldStyle) {
        oldStyle.remove();
    }

    style.id = 'syntax-colors';
    document.head.appendChild(style);
    updateCodeHighlighting();
}

// Gestion des paires de caractères
function handleCharacterPairs(e) {
    const pairs = {
        '"': '"',
        "'": "'",
        '(': ')',
        '[': ']',
        '{': '}'
    };

    if (pairs[e.key]) {
        e.preventDefault();
        const codeEditor = document.getElementById('codeEditor');
        const start = codeEditor.selectionStart;
        const end = codeEditor.selectionEnd;

        if (start !== end) {
            const selectedText = codeEditor.value.substring(start, end);
            codeEditor.value = codeEditor.value.substring(0, start) +
                e.key + selectedText + pairs[e.key] +
                codeEditor.value.substring(end);
            codeEditor.selectionStart = start;
            codeEditor.selectionEnd = end + 2;
        } else {
            codeEditor.value = codeEditor.value.substring(0, start) +
                e.key + pairs[e.key] +
                codeEditor.value.substring(end);
            codeEditor.selectionStart = codeEditor.selectionEnd = start + 1;
        }
        updateCodeHighlighting();
    }
}

// Gestion de la tabulation
function handleTabKey(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        const codeEditor = document.getElementById('codeEditor');
        const start = codeEditor.selectionStart;
        const end = codeEditor.selectionEnd;
        codeEditor.value = codeEditor.value.substring(0, start) + "    " + codeEditor.value.substring(end);
        codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
        updateCodeHighlighting();
    }
}

// Initialisation de l'éditeur
async function initializeEditor() {
    const codeEditor = document.getElementById('codeEditor');
    if (!codeEditor) {
        console.error("L'éditeur de code n'a pas été trouvé");
        return;
    }

    // Initialiser avec le contenu du fichier courant
    if (currentFile && currentFile.content) {
        codeEditor.value = currentFile.content;
    }

    // Ajouter les écouteurs d'événements
    codeEditor.addEventListener('input', () => {
        updateCodeHighlighting();
        updateLineCounter();
    });

    codeEditor.addEventListener('keydown', handleTabKey);
    codeEditor.addEventListener('keypress', handleCharacterPairs);
    codeEditor.addEventListener('scroll', () => {
        const highlightLayer = document.querySelector('.highlight-layer');
        if (highlightLayer) {
            highlightLayer.scrollTop = codeEditor.scrollTop;
            highlightLayer.scrollLeft = codeEditor.scrollLeft;
        }
    });

    // Initialisation des couleurs de syntaxe
    if (syntaxColors) {
        updateSyntaxColors(syntaxColors);
    }

    // Mise à jour initiale
    updateCodeHighlighting();
    updateLineCounter();

    return Promise.resolve();
}

export {
    updateCodeHighlighting,
    updateSyntaxColors,
    initializeEditor
}; 