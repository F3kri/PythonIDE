import { pythonSuggestions, jsSuggestions, currentLanguage } from './config.js';
import { updateCodeHighlighting } from './editor.js';

let suggestionBox = null;

// Création de la boîte de suggestions
function createSuggestionBox() {
    const box = document.createElement('div');
    box.id = 'suggestionBox';
    box.style.cssText = `
        position: absolute;
        background: var(--editor-bg);
        border: 1px solid var(--primary-color);
        border-radius: 4px;
        max-height: 150px;
        overflow-y: auto;
        display: none;
        z-index: 1000;
        box-shadow: var(--box-shadow);
    `;
    document.querySelector('.editor-container').appendChild(box);
    return box;
}

// Affichage des suggestions
function showSuggestions(suggestions, word) {
    if (!suggestionBox) {
        suggestionBox = createSuggestionBox();
    }

    const { left, top, height } = getCaretCoordinates();

    suggestionBox.innerHTML = suggestions
        .map(suggestion => `<div class="suggestion-item">${suggestion}</div>`)
        .join('');

    suggestionBox.style.display = 'block';
    suggestionBox.style.left = `${left}px`;
    suggestionBox.style.top = `${top + height}px`;

    const items = suggestionBox.querySelectorAll('.suggestion-item');
    if (items.length > 0) {
        items[0].classList.add('active');
    }

    items.forEach(item => {
        item.addEventListener('click', () => {
            applySuggestion(item.textContent, word);
        });
    });
}

// Obtention des coordonnées du curseur
function getCaretCoordinates() {
    const codeEditor = document.getElementById('codeEditor');
    const position = codeEditor.selectionStart;
    const text = codeEditor.value.substring(0, position);
    const lines = text.split('\n');
    const currentLine = lines.length;
    const currentColumn = lines[lines.length - 1].length;

    const lineHeight = parseInt(getComputedStyle(codeEditor).lineHeight);
    const padding = parseInt(getComputedStyle(codeEditor).padding);

    return {
        left: currentColumn * 8 + padding + 48, // 48px pour la gouttière
        top: (currentLine - 1) * lineHeight + padding,
        height: lineHeight
    };
}

// Application de la suggestion
function applySuggestion(suggestion, word) {
    const codeEditor = document.getElementById('codeEditor');
    const cursorPos = codeEditor.selectionStart;
    const textBeforeCursor = codeEditor.value.substring(0, cursorPos - word.length);
    const textAfterCursor = codeEditor.value.substring(cursorPos);

    const cleanTextAfter = textAfterCursor.trimLeft();
    const isInsideParentheses = textBeforeCursor.trim().endsWith('(') && cleanTextAfter.startsWith(')');

    let finalText;
    if (isInsideParentheses) {
        finalText = textBeforeCursor.trimEnd() + suggestion.slice(0, -1) + cleanTextAfter;
    } else {
        finalText = textBeforeCursor + suggestion + cleanTextAfter;
    }

    codeEditor.value = finalText;

    const newCursorPos = textBeforeCursor.length + suggestion.length;
    if (suggestion.includes('()')) {
        codeEditor.selectionStart = codeEditor.selectionEnd = newCursorPos - 1;
    } else {
        codeEditor.selectionStart = codeEditor.selectionEnd = newCursorPos;
    }

    suggestionBox.style.display = 'none';
    updateCodeHighlighting();
}

// Mise à jour de l'élément actif
function updateActiveItem(items, activeIndex) {
    items.forEach(item => item.classList.remove('active'));
    items[activeIndex].classList.add('active');
    items[activeIndex].scrollIntoView({ block: 'nearest' });
}

// Gestion des événements clavier pour les suggestions
function handleSuggestionKeys(e) {
    if (suggestionBox && suggestionBox.style.display === 'block') {
        const items = suggestionBox.querySelectorAll('.suggestion-item');
        const activeItem = suggestionBox.querySelector('.suggestion-item.active') || items[0];
        let activeIndex = Array.from(items).indexOf(activeItem);

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                activeIndex = (activeIndex + 1) % items.length;
                updateActiveItem(items, activeIndex);
                break;
            case 'ArrowUp':
                e.preventDefault();
                activeIndex = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
                updateActiveItem(items, activeIndex);
                break;
            case 'Tab':
            case 'Enter':
                e.preventDefault();
                if (items.length > 0) {
                    const textBeforeCursor = document.getElementById('codeEditor').value
                        .substring(0, document.getElementById('codeEditor').selectionStart);
                    const lastWord = textBeforeCursor.split(/[\s\n]/).pop();
                    applySuggestion(activeItem.textContent, lastWord);
                }
                break;
            case 'Escape':
                e.preventDefault();
                suggestionBox.style.display = 'none';
                break;
        }
    }
}

// Initialisation du système de suggestions
function initializeSuggestions() {
    const codeEditor = document.getElementById('codeEditor');
    
    codeEditor.addEventListener('input', (e) => {
        const cursorPos = codeEditor.selectionStart;
        const textBeforeCursor = codeEditor.value.substring(0, cursorPos);
        const lastWord = textBeforeCursor.split(/[\s\n]/).pop();

        if (lastWord && lastWord.length >= 2) {
            const suggestions = currentLanguage === 'python' ? pythonSuggestions : jsSuggestions;
            const matches = Object.entries(suggestions)
                .filter(([key]) => key.startsWith(lastWord))
                .map(([key, value]) => value);

            if (matches.length > 0) {
                showSuggestions(matches, lastWord);
            } else {
                if (suggestionBox) {
                    suggestionBox.style.display = 'none';
                }
            }
        } else {
            if (suggestionBox) {
                suggestionBox.style.display = 'none';
            }
        }
    });

    codeEditor.addEventListener('keydown', handleSuggestionKeys);
}

export {
    initializeSuggestions,
    createSuggestionBox,
    showSuggestions,
    applySuggestion,
    updateActiveItem
}; 