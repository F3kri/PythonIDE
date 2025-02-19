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

// Ajouter après les constantes au début du fichier
const pythonSuggestions = {
    'pr': 'print()',
    'inp': 'input()',
    'def': 'def function_name():',
    'for': 'for i in range():',
    'if': 'if condition:',
    'wh': 'while condition:',
    'try': 'try:\n    \nexcept Exception as e:',
    'imp': 'import ',
    'cls': 'class ClassName:',
    'ret': 'return ',
    'len': 'len()',
    'str': 'str()',
    'int': 'int()',
    'lis': 'list()',
    'ran': 'range()',
};

const jsSuggestions = {
    'con': 'console.log()',
    'fun': 'function name() {\n    \n}',
    'for': 'for (let i = 0; i < n; i++) {\n    \n}',
    'if': 'if (condition) {\n    \n}',
    'wh': 'while (condition) {\n    \n}',
    'try': 'try {\n    \n} catch (error) {\n    \n}',
    'let': 'let  = ',
    'con': 'const  = ',
    'imp': 'import  from ""',
    'cls': 'class  {\n    constructor() {\n        \n    }\n}',
    'ret': 'return ',
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
    }, 2400);
});

const codeEditor = document.getElementById('codeEditor');
const runButton = document.getElementById('run');
const saveButton = document.getElementById('save');
const clearButton = document.getElementById('clear');
const consoleOutput = document.getElementById('consoleOutput');
const clearConsoleButton = document.getElementById('clearConsole');

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
    // Si une suggestion est affichée
    if (suggestionBox.style.display === 'block') {
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
                e.preventDefault(); // Empêcher l'ajout d'espace ou de saut de ligne
                if (items.length > 0) {
                    const textBeforeCursor = codeEditor.value.substring(0, codeEditor.selectionStart);
                    const lastWord = textBeforeCursor.split(/[\s\n]/).pop();
                    applySuggestion(activeItem.textContent, lastWord);
                }
                break;
            case 'Escape':
                e.preventDefault();
                suggestionBox.style.display = 'none';
                break;
        }
    } else if (e.key === 'Tab') {
        // Comportement normal de la tabulation quand il n'y a pas de suggestions
        e.preventDefault();
        const start = codeEditor.selectionStart;
        const end = codeEditor.selectionEnd;
        codeEditor.value = codeEditor.value.substring(0, start) + "    " + codeEditor.value.substring(end);
        codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
        updateCodeHighlighting();
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

// Ajouter cette fonction pour créer la boîte de suggestions
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

// Créer la boîte de suggestions
const suggestionBox = createSuggestionBox();

// Modifier l'événement input de l'éditeur
codeEditor.addEventListener('input', (e) => {
    updateCodeHighlighting();

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
            suggestionBox.style.display = 'none';
        }
    } else {
        suggestionBox.style.display = 'none';
    }
});

function showSuggestions(suggestions, word) {
    const { left, top, height } = getCaretCoordinates();
    
    suggestionBox.innerHTML = suggestions
        .map(suggestion => `<div class="suggestion-item">${suggestion}</div>`)
        .join('');
    
    suggestionBox.style.display = 'block';
    suggestionBox.style.left = `${left}px`;
    suggestionBox.style.top = `${top + height}px`;

    const items = suggestionBox.querySelectorAll('.suggestion-item');
    // Activer le premier item par défaut
    if (items.length > 0) {
        items[0].classList.add('active');
    }

    items.forEach(item => {
        item.addEventListener('click', () => {
            applySuggestion(item.textContent, word);
        });
    });
}

function getCaretCoordinates() {
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

function applySuggestion(suggestion, word) {
    const cursorPos = codeEditor.selectionStart;
    const textBeforeCursor = codeEditor.value.substring(0, cursorPos - word.length);
    const textAfterCursor = codeEditor.value.substring(cursorPos);
    
    // Nettoyer les espaces existants
    const cleanTextAfter = textAfterCursor.trimLeft();
    
    // Vérifier si nous sommes à l'intérieur de parenthèses
    const isInsideParentheses = textBeforeCursor.trim().endsWith('(') && cleanTextAfter.startsWith(')');
    
    let finalText;
    if (isInsideParentheses) {
        // Si nous sommes à l'intérieur de parenthèses, supprimer les espaces
        finalText = textBeforeCursor.trimEnd() + suggestion.slice(0, -1) + cleanTextAfter;
    } else {
        finalText = textBeforeCursor + suggestion + cleanTextAfter;
    }
    
    codeEditor.value = finalText;
    
    // Placer le curseur à l'intérieur des parenthèses si présentes
    const newCursorPos = textBeforeCursor.length + suggestion.length;
    if (suggestion.includes('()')) {
        codeEditor.selectionStart = codeEditor.selectionEnd = newCursorPos - 1;
    } else {
        codeEditor.selectionStart = codeEditor.selectionEnd = newCursorPos;
    }
    
    suggestionBox.style.display = 'none';
    updateCodeHighlighting();
}

// Ajouter les styles CSS pour les suggestions
const style = document.createElement('style');
style.textContent = `
    .suggestion-item {
        padding: 4px 8px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .suggestion-item:hover {
        background: var(--primary-color);
        color: white;
    }
    
    #suggestionBox::-webkit-scrollbar {
        width: 6px;
    }
    
    #suggestionBox::-webkit-scrollbar-track {
        background: rgba(99, 102, 241, 0.1);
    }
    
    #suggestionBox::-webkit-scrollbar-thumb {
        background: var(--primary-color);
        border-radius: 3px;
    }
`;
document.head.appendChild(style);

// Modifier l'événement keydown de l'éditeur
codeEditor.addEventListener('keydown', (e) => {
    if (suggestionBox.style.display === 'block') {
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
                e.preventDefault(); // Empêcher l'ajout d'espace ou de saut de ligne
                if (items.length > 0) {
                    const textBeforeCursor = codeEditor.value.substring(0, codeEditor.selectionStart);
                    const lastWord = textBeforeCursor.split(/[\s\n]/).pop();
                    applySuggestion(activeItem.textContent, lastWord);
                }
                break;
            case 'Escape':
                e.preventDefault();
                suggestionBox.style.display = 'none';
                break;
        }
    } else if (e.key === 'Tab') {
        // Comportement normal de la tabulation quand il n'y a pas de suggestions
        e.preventDefault();
        const start = codeEditor.selectionStart;
        const end = codeEditor.selectionEnd;
        codeEditor.value = codeEditor.value.substring(0, start) + "    " + codeEditor.value.substring(end);
        codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
        updateCodeHighlighting();
    }
});

function updateActiveItem(items, activeIndex) {
    items.forEach(item => item.classList.remove('active'));
    items[activeIndex].classList.add('active');
    items[activeIndex].scrollIntoView({ block: 'nearest' });
}

// Fonction pour créer la fenêtre de chat
function createAIChatWindow() {
    const chatWindow = document.createElement('div');
    chatWindow.className = 'ai-chat-window';
    chatWindow.innerHTML = `
        <div class="chat-header">
            <h3><i class="fas fa-robot"></i> Assistant IA</h3>
            <div class="chat-actions">
                <button class="reset-chat" title="Réinitialiser la discussion">
                    <i class="fas fa-trash-alt"></i>
                </button>
                <button class="close-chat">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        <div class="chat-messages"></div>
        <div class="chat-input">
            <textarea placeholder="..."></textarea>
            <button class="send-message"><i class="fas fa-paper-plane"></i></button>
        </div>
    `;
    document.body.appendChild(chatWindow);

    // Ajouter la fonctionnalité de déplacement
    const header = chatWindow.querySelector('.chat-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    header.addEventListener('mousedown', startDragging);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDragging);

    function startDragging(e) {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        if (e.target.closest('.chat-header')) {
            isDragging = true;
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;
            chatWindow.style.transform = `translate(${currentX}px, ${currentY}px)`;
        }
    }

    function stopDragging() {
        isDragging = false;
    }

    return chatWindow;
}

// Styles pour la fenêtre de chat
const aiStyles = document.createElement('style');
aiStyles.textContent = `
    .ai-chat-window {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 350px;
        height: 500px;
        background: var(--glass-bg);
        border: var(--glass-border);
        border-radius: var(--border-radius);
        display: flex;
        flex-direction: column;
        backdrop-filter: var(--glass-blur);
        box-shadow: var(--box-shadow);
        z-index: 1000;
        display: none;
        user-select: none;
    }

    .chat-header {
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(99, 102, 241, 0.1);
        cursor: move;
        background: rgba(99, 102, 241, 0.1);
    }

    .chat-header h3 {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--primary-color);
    }

    .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
        user-select: text;
    }

    .chat-input {
        padding: 1rem;
        display: flex;
        gap: 0.5rem;
        border-top: 1px solid rgba(99, 102, 241, 0.1);
        background: var(--glass-bg);
    }

    .chat-input textarea {
        flex: 1;
        padding: 0.75rem;
        border: 1px solid rgba(99, 102, 241, 0.2);
        border-radius: var(--border-radius);
        background: rgba(99, 102, 241, 0.05);
        color: var(--text-color);
        resize: none;
        height: 40px;
        font-family: inherit;
        transition: all 0.3s ease;
    }

    .chat-actions button {
        background: none;
        border: none;
        color: var(--text-color);
        cursor: pointer;
        padding: 0.5rem;
        transition: all 0.3s ease;
        opacity: 0.7;
    }

    .chat-actions button:hover {
        opacity: 1;
        transform: scale(1.1);
        color: var(--primary-color);
    }

    .send-message {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: var(--box-shadow);
    }

    .send-message:hover {
        transform: translateY(-2px);
        box-shadow: var(--neon-glow);
        background: var(--primary-hover);
    }

    .send-message i {
        font-size: 1rem;
        transition: transform 0.3s ease;
    }

    .send-message:hover i {
        transform: translateX(2px);
    }
`;
document.head.appendChild(aiStyles);

// Initialisation de la fenêtre de chat
const aiHelper = document.getElementById('aiHelper');
const chatWindow = createAIChatWindow();
let isChatVisible = false;

// Gestionnaires d'événements pour l'ouverture/fermeture
aiHelper.addEventListener('click', () => {
    isChatVisible = !isChatVisible;
    chatWindow.style.display = isChatVisible ? 'flex' : 'none';
});

const closeChat = chatWindow.querySelector('.close-chat');
closeChat.addEventListener('click', () => {
    chatWindow.style.display = 'none';
    isChatVisible = false;
});

// Gestionnaire pour le bouton de réinitialisation
const resetButton = chatWindow.querySelector('.reset-chat');
resetButton.addEventListener('click', () => {
    const chatMessages = chatWindow.querySelector('.chat-messages');
    chatMessages.innerHTML = '';
});
