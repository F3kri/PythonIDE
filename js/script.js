let pyodide = null;
let isWaitingForInput = false;
let currentFile = {
    id: Date.now(),
    name: 'undefined.py',
    content: ''
};
let files = [];
files.push(currentFile);

let currentLanguage = 'python';

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
    setTimeout(async () => {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.style.opacity = '0';
        loadingScreen.style.visibility = 'hidden';
        await initPyodide();
    }, 1500);
});

const codeEditor = document.getElementById('codeEditor');
const lineNumbers = document.getElementById('lineNumbers');
const runButton = document.getElementById('run');
const saveButton = document.getElementById('save');
const clearButton = document.getElementById('clear');
const consoleOutput = document.getElementById('consoleOutput');
const clearConsoleButton = document.getElementById('clearConsole');

function updateLineNumbers() {
    const lines = codeEditor.value.split('\n');
    lineNumbers.innerHTML = lines.map((_, index) => index + 1).join('<br>');
}

updateLineNumbers();

codeEditor.addEventListener('input', updateLineNumbers);
codeEditor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = codeEditor.scrollTop;
});

codeEditor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = codeEditor.selectionStart;
        const end = codeEditor.selectionEnd;
        codeEditor.value = codeEditor.value.substring(0, start) + "    " + codeEditor.value.substring(end);
        codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
    }
});

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
    updateLineNumbers();
});

function createNewFile() {
    const fileName = window.prompt("Nom du fichier (max 16 caractères) :", "nouveau_fichier.py");
    if (!fileName) return;

    const baseName = fileName.replace('.py', '');
    if (baseName.length > 16) {
        alert("Le nom du fichier ne doit pas dépasser 16 caractères");
        return;
    }

    if (!fileName.endsWith('.py')) {
        alert("Le fichier doit avoir l'extension .py");
        return;
    }

    const newFile = {
        id: Date.now(),
        name: `${baseName}.py`,
        content: ''
    };

    files.push(newFile);
    currentFile = newFile;
    updateFileExplorer();
    codeEditor.value = '';
    updateLineNumbers();
}

function updateFileExplorer() {
    const fileExplorer = document.getElementById('fileExplorer');
    fileExplorer.innerHTML = '';

    files.forEach(file => {
        const fileElement = document.createElement('div');
        fileElement.className = 'file-item' + (currentFile && currentFile.id === file.id ? ' active' : '');
        
        const fileIcon = document.createElement('i');
        fileIcon.className = 'fas fa-file-code';
        
        const fileName = document.createElement('span');
        fileName.title = file.name;
        fileName.textContent = file.name;
        
        const fileActions = document.createElement('div');
        fileActions.className = 'file-actions';
        
        const renameButton = document.createElement('button');
        renameButton.innerHTML = '<i class="fas fa-edit"></i>';
        renameButton.title = 'Renommer';
        
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.title = 'Supprimer';
        
        fileActions.appendChild(renameButton);
        fileActions.appendChild(deleteButton);
        
        fileElement.appendChild(fileIcon);
        fileElement.appendChild(fileName);
        fileElement.appendChild(fileActions);
        
        renameButton.addEventListener('click', (e) => {
            e.stopPropagation();
            renameFile(file.id);
        });
        
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteFile(file.id);
        });
        
        fileElement.addEventListener('click', () => switchFile(file));
        
        fileExplorer.appendChild(fileElement);
    });

    document.getElementById('currentFileName').textContent = currentFile.name;
}

function switchFile(file) {
    if (currentFile) {
        currentFile.content = codeEditor.value;
    }
    currentFile = file;
    codeEditor.value = file.content;
    setLanguage(file.name.endsWith('.js') ? '.js' : '.py');
    updateLineNumbers();
    updateFileExplorer();
}

function deleteFile(fileId) {
    if (!confirm('Voulez-vous vraiment supprimer ce fichier ?')) return;

    const index = files.findIndex(f => f.id === fileId);
    if (index !== -1) {
        files.splice(index, 1);
        if (currentFile && currentFile.id === fileId) {
            currentFile = files[0] || null;
            codeEditor.value = currentFile ? currentFile.content : '';
            updateLineNumbers();
        }
        updateFileExplorer();
    }
}

function renameFile(fileId) {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    const newName = window.prompt("Nouveau nom du fichier (max 16 caractères) :", file.name);
    if (!newName) return;

    const baseName = newName.replace('.py', '');
    if (baseName.length > 16) {
        alert("Le nom du fichier ne doit pas dépasser 16 caractères");
        return;
    }

    file.name = baseName.endsWith('.py') ? baseName : baseName + '.py';
    updateFileExplorer();
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
