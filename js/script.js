let pyodide = null;
let isWaitingForInput = false;
let currentFile = {
    id: Date.now(),
    name: 'undefined.py',
    content: 'print("Hello World !")'
};
let files = [];
files.push(currentFile);

let currentLanguage = 'python';

let syntaxColors = JSON.parse(localStorage.getItem('syntaxColors')) || {
    keywordColor: '#60a5fa',
    stringColor: '#34d399',
    functionColor: '#f59e0b',
    numberColor: '#f87171'
};

function setLanguage(extension) {
    currentLanguage = extension === '.py' ? 'python' : 'javascript';
    const runButton = document.getElementById('run');
    runButton.title = currentLanguage === 'python' ? 'Exécuter Python' : 'Exécuter JavaScript';
}

async function initPyodide() {
    try {
        pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.21.3/full/"
        });

        await pyodide.runPythonAsync(`
            import sys
            from js import customInput
            
            def input(prompt_text=""):
                return str(customInput(prompt_text))
            
            def int_input(prompt_text=""):
                val = customInput(prompt_text)
                return int(val)
                
            globals()['input'] = input
            globals()['int_input'] = int_input
            __builtins__.input = input
            __builtins__.int_input = int_input
        `);
    } catch (error) {
        consoleOutput.innerHTML += `<div class="error-message">${error.message}</div>`;
    }
}

window.addEventListener('load', () => {
    const loadingText = document.querySelector('.typing-text');
    const messages = [
        'Chargement...',
        'Configuration...',
        'Presque prêt...'
    ];
    let messageIndex = 0;

    const updateMessage = () => {
        loadingText.textContent = messages[messageIndex];
        messageIndex = (messageIndex + 1) % messages.length;
    };

    const messageInterval = setInterval(updateMessage, 800);

    setTimeout(() => {
        clearInterval(messageInterval);
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.style.opacity = '0';
        loadingScreen.style.visibility = 'hidden';
        initPyodide();
        // Ajouter un compteur de ligne à l'éditeur de code
        const codeEditor = document.getElementById('codeEditor');

        // Créer un élément pour afficher les numéros de ligne
        const lineNumbersContainer = document.createElement('div');
        lineNumbersContainer.className = 'line-numbers-container';

        // Ajouter le conteneur de numéros de ligne en dessous du codeEditor
        codeEditor.parentNode.insertBefore(lineNumbersContainer, codeEditor.nextSibling);

        // Mettre à jour les numéros de ligne
        function updateLineNumbers() {
            const lines = codeEditor.value.split('\n');
            let lineNumbersHTML = '';

            lines.forEach((_, index) => {
                lineNumbersHTML += `<span>${index + 1}</span>`;
            });

            lineNumbersContainer.innerHTML = lineNumbersHTML;
        }

        // Mettre à jour les numéros de ligne au démarrage
        updateLineNumbers();

        // Mettre à jour les numéros de ligne à chaque modification du texte
        codeEditor.addEventListener('input', updateLineNumbers);

        // Mettre à jour les numéros de ligne lors du scroll de la text area
        codeEditor.addEventListener('scroll', () => {
            lineNumbersContainer.scrollTop = codeEditor.scrollTop;
        });

        // Initialiser les numéros de ligne
        updateLineNumbers();
    }, 2400);
});

const codeEditor = document.getElementById('codeEditor');
const runButton = document.getElementById('run');
const saveButton = document.getElementById('save');
const clearButton = document.getElementById('clear');
const consoleOutput = document.getElementById('consoleOutput');
const clearConsoleButton = document.getElementById('clearConsole');
const maxConsaleButton = document.getElementById('maxConsale');

let scrollTimeout;
codeEditor.addEventListener('scroll', () => {
    const highlightLayer = document.querySelector('.highlight-layer');
    if (highlightLayer) {
        highlightLayer.scrollTop = codeEditor.scrollTop;
        highlightLayer.scrollLeft = codeEditor.scrollLeft;
    }
}, { passive: true });

function createCustomPrompt(message, title) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'custom-modal';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        const modalTitle = document.createElement('div');
        modalTitle.className = 'modal-title';
        modalTitle.textContent = title;

        const modalMessage = document.createElement('div');
        modalMessage.className = 'modal-message';
        modalMessage.textContent = message;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'modal-input';

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'modal-buttons';

        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.onclick = () => {
            document.body.removeChild(modal);
            resolve(input.value);
        };

        buttonContainer.appendChild(okButton);
        modalContent.appendChild(modalTitle);
        modalContent.appendChild(modalMessage);
        modalContent.appendChild(input);
        modalContent.appendChild(buttonContainer);
        modal.appendChild(modalContent);

        document.body.appendChild(modal);
        input.focus();

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                okButton.click();
            }
        });
    });
}

function createInputArea(promptText) {
    if (isWaitingForInput) return;
    isWaitingForInput = true;

    return new Promise((resolve) => {
        const value = window.prompt(promptText);

        isWaitingForInput = false;
        if (promptText.toLowerCase().includes('age')) {
            resolve(parseInt(value) || 0);
        } else {
            resolve(value);
        }
    });
}

runButton.addEventListener('click', async () => {
    if (!pyodide) {
        consoleOutput.innerHTML += '<div class="error-message">Pyodide n\'est pas encore chargé. Veuillez patienter...</div>';
        return;
    }

    let code = codeEditor.value;

    // Remplacer tous les int(input(...)) par int_input(...)
    code = code.replace(/int\(input\((.*?)\)\)/g, 'int_input($1)');

    consoleOutput.innerHTML = '';

    try {
        await pyodide.runPythonAsync(`
            import sys
            from io import StringIO
            
            class CustomStringIO(StringIO):
                def write(self, text):
                    if text.endswith('\\n'):
                        super().write(text)
                    else:
                        super().write(text + '\\n')
                        
            sys.stdout = CustomStringIO()
        `);

        await pyodide.runPythonAsync(code);

        const output = await pyodide.runPythonAsync(`sys.stdout.getvalue()`);
        if (output && output.trim()) {
            const lines = output.split('\n').filter(line => line.trim());
            consoleOutput.innerHTML += lines
                .map(line => `<div class="output-message">${line}</div>`)
                .join('');
        }
    } catch (error) {
        consoleOutput.innerHTML += `<div class="error-message">${error.message}</div>`;
    }
});

clearConsoleButton.addEventListener('click', () => {
    consoleOutput.innerHTML = '';
});

maxConsaleButton.addEventListener('click', () => {
    const mainContent = document.querySelector('.main-content')
    const isCollapsed = mainContent.classList.toggle('collapsedm');
    maxConsaleButton.querySelector('i').className = isCollapsed ?
        'fas fa-chevron-down' : 'fas fa-chevron-up';
});

clearButton.addEventListener('click', () => {
    codeEditor.value = '';
    updateCodeHighlighting();
});

function createNewFile() {
    createModal('Nouveau fichier', 'nouveau_fichier.py').then(fileName => {
        if (!fileName) return;

        const baseName = fileName.replace('.py', '');
        if (baseName.length > 16) {
            alert("Le nom du fichier ne doit pas dépasser 16 caractères");
            return;
        }

        const newFile = {
            id: Date.now(),
            name: baseName.endsWith('.py') ? baseName : baseName + '.py',
            content: 'print("Hello World !")'
        };

        files.push(newFile);
        currentFile = newFile;
        updateFileExplorer();
        codeEditor.value = newFile.content;
        updateCodeHighlighting();
    });
}

function updateFileExplorer() {
    const fragment = document.createDocumentFragment();

    // Créer une structure arborescente
    const treeStructure = {};
    files.forEach(file => {
        const path = (file.path || file.name).split('/');
        let current = treeStructure;

        // Créer les dossiers parents
        for (let i = 0; i < path.length - 1; i++) {
            if (!current[path[i]]) {
                current[path[i]] = { type: 'folder', content: {}, isOpen: true };
            }
            current = current[path[i]].content;
        }

        // Ajouter le fichier
        const fileName = path[path.length - 1];
        current[fileName] = { type: 'file', data: file };
    });

    // Fonction récursive pour créer l'interface
    function createTreeElement(structure, level = 0) {
        const items = [];

        // Trier : dossiers d'abord, puis fichiers
        const sorted = Object.entries(structure).sort(([, a], [, b]) => {
            if (a.type === b.type) return 0;
            return a.type === 'folder' ? -1 : 1;
        });

        for (const [name, item] of sorted) {
            const element = document.createElement('div');
            element.className = 'file-item';

            if (item.type === 'folder') {
                element.style.paddingLeft = `${level * 1.2 + 0.75}rem`;
                element.innerHTML = `
                    <div class="folder-header">
                        <i class="fas ${item.isOpen ? 'fa-chevron-down' : 'fa-chevron-right'} folder-arrow"></i>
                        <i class="fas fa-folder${item.isOpen ? '-open' : ''} folder-icon"></i>
                        <span>${name}</span>
                    </div>
                `;

                const folderContent = document.createElement('div');
                folderContent.className = 'folder-content';
                folderContent.style.display = item.isOpen ? 'block' : 'none';

                // Récursion pour le contenu du dossier
                const children = createTreeElement(item.content, level + 1);
                children.forEach(child => folderContent.appendChild(child));
                element.appendChild(folderContent);

                // Gestionnaire de clic pour ouvrir/fermer le dossier
                element.querySelector('.folder-header').addEventListener('click', () => {
                    item.isOpen = !item.isOpen;
                    element.querySelector('.folder-arrow').className =
                        `fas ${item.isOpen ? 'fa-chevron-down' : 'fa-chevron-right'} folder-arrow`;
                    element.querySelector('.folder-icon').className =
                        `fas fa-folder${item.isOpen ? '-open' : ''} folder-icon`;
                    folderContent.style.display = item.isOpen ? 'block' : 'none';
                });
            } else {
                element.style.paddingLeft = `${(level + 1) * 1.2 + 0.75}rem`;
                element.innerHTML = `
                    <div class="file-content">
                        <i class="fas fa-file-code"></i>
                        <span>${name}</span>
                        <div class="file-actions">
                            <button class="rename-file"><i class="fas fa-edit"></i></button>
                            <button class="delete-file"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;

                // Ajouter les gestionnaires d'événements pour les boutons
                element.querySelector('.rename-file').addEventListener('click', (e) => {
                    e.stopPropagation();
                    createModal('Renommer le fichier', item.data.name).then(newName => {
                        if (newName && newName !== item.data.name) {
                            const extension = item.data.name.split('.').pop();
                            const baseName = newName.replace('.' + extension, '');

                            if (baseName.length > 16) {
                                alert("Le nom du fichier ne doit pas dépasser 16 caractères");
                                return;
                            }

                            item.data.name = baseName.endsWith('.' + extension) ? baseName : baseName + '.' + extension;
                            updateFileExplorer();
                        }
                    });
                });

                element.querySelector('.delete-file').addEventListener('click', (e) => {
                    e.stopPropagation();

                    // Vérifier si c'est le dernier fichier
                    if (files.length <= 1) {
                        createModal('Action impossible', 'Impossible de supprimer le dernier fichier.', null, 'alert');
                        return;
                    }

                    createModal('Supprimer le fichier', `Voulez-vous vraiment supprimer "${item.data.name}" ?`, null, 'confirm')
                        .then(confirmed => {
                            if (confirmed) {
                                files = files.filter(f => f.id !== item.data.id);
                                if (currentFile && currentFile.id === item.data.id) {
                                    currentFile = files[0];
                                    codeEditor.value = currentFile.content;
                                    document.getElementById('currentFileName').textContent = currentFile.name;
                                    updateCodeHighlighting();
                                }
                                updateFileExplorer();
                            }
                        });
                });

                if (currentFile && currentFile.id === item.data.id) {
                    element.classList.add('active');
                }

                element.addEventListener('click', (e) => {
                    if (!e.target.closest('.file-actions')) {
                        switchFile(item.data);
                    }
                });
            }
            items.push(element);
        }
        return items;
    }

    const elements = createTreeElement(treeStructure);
    elements.forEach(element => fragment.appendChild(element));

    const fileExplorer = document.getElementById('fileExplorer');
    fileExplorer.innerHTML = '';
    fileExplorer.appendChild(fragment);
}

function switchFile(file) {
    if (currentFile) {
        currentFile.content = codeEditor.value;
    }
    currentFile = file;
    codeEditor.value = file.content;
    setLanguage(file.name.endsWith('.js') ? '.js' : '.py');
    updateCodeHighlighting();
    updateFileExplorer();
}

function createModal(title, content, onConfirm, type = 'input') {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-container';

    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `<h3>${title}</h3>`;

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    if (type === 'input') {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'modal-input';
        input.value = content;
        modalContent.appendChild(input);
    } else {
        modalContent.innerHTML = `<p>${content}</p>`;
    }

    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    if (type !== 'alert') {
        const cancelButton = document.createElement('button');
        cancelButton.className = 'modal-button secondary';
        cancelButton.textContent = 'Annuler';
        actions.appendChild(cancelButton);

        cancelButton.onclick = () => {
            close();
            resolve(null);
        };
    }

    const confirmButton = document.createElement('button');
    confirmButton.className = 'modal-button primary';
    confirmButton.textContent = type === 'input' && title === 'Renommer le fichier' ? 'Renommer' :
        type === 'input' && title === 'Nouveau fichier' ? 'Créer' :
            type === 'confirm' ? 'Supprimer' : 'OK';
    actions.appendChild(confirmButton);

    modal.appendChild(header);
    modal.appendChild(modalContent);
    modal.appendChild(actions);
    overlay.appendChild(modal);

    document.body.appendChild(overlay);

    setTimeout(() => overlay.classList.add('active'), 0);

    if (type === 'input') {
        const input = modalContent.querySelector('input');
        input.focus();
        input.select();
    }

    return new Promise((resolve) => {
        const close = () => {
            overlay.classList.remove('active');
            setTimeout(() => document.body.removeChild(overlay), 300);
        };

        if (type === 'colors') {
            modalContent.innerHTML = content;
            confirmButton.onclick = () => {
                const colors = {
                    keywordColor: document.getElementById('keywordColor').value,
                    stringColor: document.getElementById('stringColor').value,
                    functionColor: document.getElementById('functionColor').value,
                    numberColor: document.getElementById('numberColor').value
                };
                close();
                resolve(colors);
            };
        } else {
            confirmButton.onclick = () => {
                const value = type === 'input' ? modalContent.querySelector('input').value : true;
                close();
                resolve(value);
            };
        }

        if (type !== 'alert') {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    close();
                    resolve(null);
                }
            });
        }
    });
}

async function renameFile(fileId) {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    const newName = await createModal('Renommer le fichier', file.name);
    if (!newName) return;

    const baseName = newName.replace('.py', '');
    if (baseName.length > 16) {
        alert("Le nom du fichier ne doit pas dépasser 16 caractères");
        return;
    }

    file.name = baseName.endsWith('.py') ? baseName : baseName + '.py';
    updateFileExplorer();
}

async function deleteFile(fileId) {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    if (files.length <= 1) {
        await createModal(
            'Suppression impossible',
            'Il doit toujours y avoir au moins un fichier dans l\'explorateur.',
            null,
            'alert'
        );
        return;
    }

    const confirmed = await createModal(
        'Supprimer le fichier',
        `Voulez-vous vraiment supprimer "${file.name}" ?`,
        null,
        'confirm'
    );

    if (!confirmed) return;

    const index = files.findIndex(f => f.id === fileId);
    if (index !== -1) {
        files.splice(index, 1);
        if (currentFile && currentFile.id === fileId) {
            currentFile = files[0];
            codeEditor.value = currentFile.content;
        }
        updateFileExplorer();
    }
}

updateFileExplorer();

document.getElementById('newFile').addEventListener('click', createNewFile);

document.body.setAttribute('data-theme', 'dark');

const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('i');

themeToggle.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);

    themeIcon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
});

saveButton.addEventListener('click', () => {
    const code = codeEditor.value;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'code.py';
    a.click();
    URL.revokeObjectURL(url);
});

const pythonKeywords = [
    'and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del', 'elif',
    'else', 'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import',
    'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass', 'raise',
    'return', 'True', 'try', 'while', 'with', 'yield'
];

const jsKeywords = [
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
    'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
    'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'return',
    'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void',
    'while', 'with', 'yield', 'let', 'static', 'enum', 'await', 'async'
];

codeEditor.addEventListener('input', (e) => {
    const cursorPos = codeEditor.selectionStart;
    const textBeforeCursor = codeEditor.value.substring(0, cursorPos);
    const words = textBeforeCursor.split(/\s+/);
    const currentWord = words[words.length - 1];

    if (currentWord.length >= 2) {
        const keywords = currentLanguage === 'python' ? pythonKeywords : jsKeywords;
        const matches = keywords.filter(word => word.startsWith(currentWord));
        if (matches.length > 0) {
            console.log(`Suggestions ${currentLanguage}:`, matches);
        }
    }
});

globalThis.customInput = (promptText) => {
    const value = window.prompt(promptText);
    return value === null ? "" : value;
};

function updateCodeHighlighting() {
    // Obtenir le code
    const code = codeEditor.value;

    // Créer un élément pre temporaire pour la coloration
    const preElement = document.createElement('pre');
    preElement.className = currentLanguage === 'python' ? 'language-python' : 'language-javascript';

    // Créer un élément code pour le contenu
    const codeElement = document.createElement('code');
    codeElement.className = currentLanguage === 'python' ? 'language-python' : 'language-javascript';
    codeElement.textContent = code;

    preElement.appendChild(codeElement);

    // Appliquer la coloration syntaxique
    Prism.highlightElement(codeElement);

    // Mettre à jour le contenu de l'éditeur
    const highlightedContent = codeElement.innerHTML;

    // Créer un div pour contenir le texte coloré
    const highlightLayer = document.createElement('div');
    highlightLayer.className = 'highlight-layer';
    highlightLayer.innerHTML = highlightedContent;

    // Mettre à jour la couche de coloration
    const existingLayer = document.querySelector('.highlight-layer');
    if (existingLayer) {
        existingLayer.innerHTML = highlightedContent;
    } else {
        document.querySelector('.editor-container').appendChild(highlightLayer);
    }
}

// Modifier l'événement input de l'éditeur
codeEditor.addEventListener('input', () => {
    updateCodeHighlighting();
});

// Ajouter au switchFile
function switchFile(file) {
    if (currentFile) {
        currentFile.content = codeEditor.value;
    }
    currentFile = file;
    codeEditor.value = file.content;
    setLanguage(file.name.endsWith('.js') ? '.js' : '.py');
    updateCodeHighlighting();
    updateFileExplorer();
}

codeEditor.value = currentFile.content;  // Initialiser le contenu de l'éditeur
updateCodeHighlighting();  // Mettre à jour la coloration syntaxique 

// Ajouter la gestion du thème de syntaxe
const syntaxThemeButton = document.getElementById('syntaxTheme');
const themes = ['default', 'monokai', 'dracula'];
let currentThemeIndex = 0;

syntaxThemeButton.addEventListener('click', () => {
    createModal(
        'Thème de syntaxe',
        `<div class="syntax-theme-options">
            <div class="syntax-color-option">
                <label>Mots-clés (if, for, while...)</label>
                <input type="color" id="keywordColor" value="${syntaxColors.keywordColor}">
            </div>
            <div class="syntax-color-option">
                <label>Chaînes de caractères</label>
                <input type="color" id="stringColor" value="${syntaxColors.stringColor}">
            </div>
            <div class="syntax-color-option">
                <label>Fonctions</label>
                <input type="color" id="functionColor" value="${syntaxColors.functionColor}">
            </div>
            <div class="syntax-color-option">
                <label>Nombres</label>
                <input type="color" id="numberColor" value="${syntaxColors.numberColor}">
            </div>
        </div>`,
        null,
        'colors'
    ).then(colors => {
        if (colors) {
            updateSyntaxColors(colors);
        }
    });
});

function updateSyntaxColors(colors) {
    syntaxColors = colors; // Mettre à jour les couleurs en mémoire
    localStorage.setItem('syntaxColors', JSON.stringify(colors)); // Sauvegarder dans localStorage

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

// Initialiser le thème par défaut
document.body.setAttribute('data-syntax-theme', 'default');

// Ajouter après l'initialisation de l'éditeur
// Appliquer les couleurs sauvegardées au chargement
if (syntaxColors) {
    updateSyntaxColors(syntaxColors);
}

codeEditor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = codeEditor.selectionStart;
        const end = codeEditor.selectionEnd;
        codeEditor.value = codeEditor.value.substring(0, start) + "    " + codeEditor.value.substring(end);
        codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
        updateCodeHighlighting();
    } else if (e.key === 'Enter') {
        const start = codeEditor.selectionStart;
        const textBeforeCursor = codeEditor.value.substring(0, start);
        const lines = textBeforeCursor.split('\n');
        const currentLine = lines[lines.length - 1];

        // Compter les tabulations de la ligne courante
        const currentIndent = currentLine.match(/^ */)[0].length;
        let newIndent = currentIndent;

        // Vérifier si la ligne se termine par ":"
        if (currentLine.trim().endsWith(':')) {
            e.preventDefault();
            newIndent = currentIndent + 4; // Ajouter une tabulation
            codeEditor.value = codeEditor.value.substring(0, start) +
                "\n" + " ".repeat(newIndent) +
                codeEditor.value.substring(start);
            codeEditor.selectionStart = codeEditor.selectionEnd = start + newIndent + 1;
            updateCodeHighlighting();
        } else {
            // Conserver l'indentation courante
            e.preventDefault();
            codeEditor.value = codeEditor.value.substring(0, start) +
                "\n" + " ".repeat(currentIndent) +
                codeEditor.value.substring(start);
            codeEditor.selectionStart = codeEditor.selectionEnd = start + currentIndent + 1;
            updateCodeHighlighting();
        }
    }
});

codeEditor.addEventListener('keypress', (e) => {
    const pairs = {
        '"': '"',
        "'": "'",
        '(': ')',
        '[': ']',
        '{': '}'
    };

    if (pairs[e.key]) {
        e.preventDefault();
        const start = codeEditor.selectionStart;
        const end = codeEditor.selectionEnd;

        // Si du texte est sélectionné
        if (start !== end) {
            const selectedText = codeEditor.value.substring(start, end);
            codeEditor.value = codeEditor.value.substring(0, start) +
                e.key + selectedText + pairs[e.key] +
                codeEditor.value.substring(end);
            codeEditor.selectionStart = start;
            codeEditor.selectionEnd = end + 2;
        } else {
            // Si aucun texte n'est sélectionné
            codeEditor.value = codeEditor.value.substring(0, start) +
                e.key + pairs[e.key] +
                codeEditor.value.substring(end);
            codeEditor.selectionStart = codeEditor.selectionEnd = start + 1;
        }
        updateCodeHighlighting();
    }
});

// Supprimer tout le code concernant la barre d'outils et ne garder que la console
const toggleConsoleBtn = document.getElementById('toggleConsole');
const consoleContainer = document.querySelector('.console');
const editorContainer = document.querySelector('.editor-container');

toggleConsoleBtn.addEventListener('click', () => {
    const isCollapsed = consoleContainer.classList.toggle('collapsed');
    toggleConsoleBtn.querySelector('i').className = isCollapsed ?
        'fas fa-chevron-up' : 'fas fa-chevron-down';

    // Ajuster la taille de l'éditeur
    if (isCollapsed) {
        editorContainer.style.flex = '1';
    } else {
        editorContainer.style.flex = '1';
    }
});

// Ajouter après les autres constantes
const toggleSidebarBtn = document.getElementById('toggleSidebar');
const sidebar = document.querySelector('.sidebar');

toggleSidebarBtn.addEventListener('click', () => {
    const isCollapsed = sidebar.classList.toggle('collapsed');
    toggleSidebarBtn.querySelector('i').className = isCollapsed ?
        'fas fa-chevron-right' : 'fas fa-chevron-left';
});
