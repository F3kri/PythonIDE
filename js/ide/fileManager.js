import { currentLanguage as lang } from './config.js';
import { createModal } from './modal.js';
import { updateCodeHighlighting } from './editor.js';

export let currentFile = {
    id: Date.now(),
    name: 'Untitled.py',
    content: 'print("Hello World !")'
};

export let files = [];

// Chargement des fichiers depuis le localStorage
async function loadFilesFromLocalStorage() {
    const storedFiles = localStorage.getItem('files');
    const lastActiveFileId = localStorage.getItem('lastActiveFileId');

    if (storedFiles) {
        Object.assign(files, JSON.parse(storedFiles));
        if (files.length > 0) {
            // Si on a un dernier fichier actif, on le charge
            if (lastActiveFileId) {
                const lastFile = files.find(f => f.id === parseInt(lastActiveFileId));
                if (lastFile) {
                    Object.assign(currentFile, lastFile);
                    return;
                }
            }
            // Sinon, on charge le premier fichier
            Object.assign(currentFile, files[0]);
        }
    }
}

// Sauvegarde des fichiers dans le localStorage
function saveFilesToLocalStorage() {
    localStorage.setItem('files', JSON.stringify(files));
}

// Création d'un nouveau fichier
async function createNewFile(defaultName = 'nouveau_fichier.py') {
    const fileName = await createModal('Nouveau fichier', defaultName);
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
    Object.assign(currentFile, newFile);

    // Mettre à jour l'éditeur et l'interface
    const codeEditor = document.getElementById('codeEditor');
    if (codeEditor) {
        codeEditor.value = newFile.content;
        updateCodeHighlighting();
    }

    // Mettre à jour l'explorateur de fichiers
    updateFileExplorer();

    // Sauvegarder dans le localStorage
    saveFilesToLocalStorage();

    return newFile;
}

// Suppression d'un fichier
async function deleteFile(fileId) {
    if (files.length <= 1) {
        await createModal('Action impossible', 'Impossible de supprimer le dernier fichier.', null, 'alert');
        return false;
    }

    const confirmed = await createModal(
        'Supprimer le fichier',
        'Voulez-vous vraiment supprimer ce fichier ?',
        null,
        'confirm'
    );

    if (!confirmed) return false;

    const index = files.findIndex(f => f.id === fileId);
    if (index !== -1) {
        files.splice(index, 1);
        if (currentFile.id === fileId) {
            Object.assign(currentFile, files[0]);
            const codeEditor = document.getElementById('codeEditor');
            if (codeEditor) {
                codeEditor.value = currentFile.content;
                updateCodeHighlighting();
            }
        }
        updateFileExplorer();
        return true;
    }
    return false;
}

// Renommage d'un fichier
async function renameFile(fileId) {
    const file = files.find(f => f.id === fileId);
    if (!file) return false;

    const newName = await createModal('Renommer le fichier', file.name);
    if (!newName || newName === file.name) return false;

    const baseName = newName.replace('.py', '');
    if (baseName.length > 16) {
        alert("Le nom du fichier ne doit pas dépasser 16 caractères");
        return false;
    }

    file.name = baseName.endsWith('.py') ? baseName : baseName + '.py';
    updateFileExplorer();
    return true;
}

// Changement de fichier courant
function switchFile(file) {
    if (!file) return false;

    // Sauvegarder le contenu du fichier actuel
    const codeEditor = document.getElementById('codeEditor');
    if (codeEditor && currentFile) {
        const currentIndex = files.findIndex(f => f.id === currentFile.id);
        if (currentIndex !== -1) {
            files[currentIndex].content = codeEditor.value;
            saveFilesToLocalStorage();
        }
    }

    // Mettre à jour le fichier courant
    Object.assign(currentFile, file);

    // Mettre à jour l'interface
    const currentFileName = document.getElementById('currentFileName');
    const lineNumbersContainer = document.getElementById('line-numbers');

    if (codeEditor) {
        codeEditor.value = file.content || '';
        updateCodeHighlighting();

        // Mettre à jour les numéros de ligne
        if (lineNumbersContainer) {
            lineNumbersContainer.innerHTML = '';
            const lines = file.content.split('\n');
            lines.forEach((_, index) => {
                const span = document.createElement('span');
                span.textContent = index + 1;
                lineNumbersContainer.appendChild(span);
            });
        }
    }

    if (currentFileName) {
        currentFileName.textContent = file.name;
    }

    // Mettre à jour le langage
    const extension = file.name.endsWith('.js') ? '.js' : '.py';
    window.currentLanguage = extension === '.py' ? 'python' : 'javascript';

    const runButton = document.getElementById('run');
    if (runButton) {
        runButton.title = window.currentLanguage === 'python' ? 'Exécuter Python' : 'Exécuter JavaScript';
    }

    // Désélectionner tous les fichiers d'abord
    document.querySelectorAll('.file-item').forEach(element => {
        element.classList.remove('active');
        element.style.backgroundColor = '';
    });

    // Sélectionner le nouveau fichier
    const newActiveFile = document.querySelector(`.file-item[data-file-id="${file.id}"]`);
    if (newActiveFile) {
        newActiveFile.classList.add('active');
    }

    // Sauvegarder l'ID du fichier actif
    localStorage.setItem('lastActiveFileId', file.id);

    return true;
}

// Gestion de l'import de fichiers
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const content = e.target.result;
        let fileName = file.name;

        if (fileName.length > 16) {
            const newName = prompt("Le nom du fichier ne doit pas dépasser 16 caractères. Le renommer :");
            if (!newName) return;
            if (newName.length > 16) {
                alert("Le nouveau nom de fichier ne doit pas dépasser 16 caractères.");
                return;
            }
            fileName = `${newName}.py`;
        }

        const newFile = {
            id: Date.now(),
            name: fileName,
            content: content
        };

        files.push(newFile);
        Object.assign(currentFile, newFile);

        // Mettre à jour l'éditeur
        const codeEditor = document.getElementById('codeEditor');
        if (codeEditor) {
            codeEditor.value = newFile.content;
            updateCodeHighlighting();
        }

        updateFileExplorer();
    };
    reader.readAsText(file);
}

// Mise à jour de l'explorateur de fichiers
function updateFileExplorer() {
    updateLineCounter();
    const fragment = document.createDocumentFragment();
    document.getElementById('currentFileName').textContent = currentFile.name;

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
        for (const [name, item] of Object.entries(structure)) {
            const element = document.createElement('div');
            if (item.type === 'file') {
                element.className = 'file-item';
                element.dataset.fileId = String(item.data.id);
                element.style.paddingLeft = `${level * 1.2 + 0.75}rem`;

                // Ajouter la classe active uniquement si c'est le fichier courant
                if (currentFile && currentFile.id === item.data.id) {
                    element.classList.add('active');
                    // S'assurer qu'il n'y a pas de style inline qui pourrait interférer
                    element.style.backgroundColor = '';
                }

                element.innerHTML = `
                    <div class="file-content">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="16 16 32 32">
                            <path fill="url(#a)" d="M31.885 16c-8.124 0-7.617 3.523-7.617 3.523l.01 3.65h7.752v1.095H21.197S16 23.678 16 31.876c0 8.196 4.537 7.906 4.537 7.906h2.708v-3.804s-.146-4.537 4.465-4.537h7.688s4.32.07 4.32-4.175v-7.019S40.374 16 31.885 16zm-4.275 2.454a1.394 1.394 0 1 1 0 2.79 1.393 1.393 0 0 1-1.395-1.395c0-.771.624-1.395 1.395-1.395z"/>
                            <path fill="url(#b)" d="M32.115 47.833c8.124 0 7.617-3.523 7.617-3.523l-.01-3.65H31.97v-1.095h10.832S48 40.155 48 31.958c0-8.197-4.537-7.906-4.537-7.906h-2.708v3.803s.146 4.537-4.465 4.537h-7.688s-4.32-.07-4.32 4.175v7.019s-.656 4.247 7.833 4.247zm4.275-2.454a1.393 1.393 0 0 1-1.395-1.395 1.394 1.394 0 1 1 1.395 1.395z"/>
                            <defs>
                                <linearGradient id="a" x1="19.075" x2="34.898" y1="18.782" y2="34.658" gradientUnits="userSpaceOnUse">
                                    <stop stop-color="#387EB8"/>
                                    <stop offset="1" stop-color="#366994"/>
                                </linearGradient>
                                <linearGradient id="b" x1="28.809" x2="45.803" y1="28.882" y2="45.163" gradientUnits="userSpaceOnUse">
                                    <stop stop-color="#FFE052"/>
                                    <stop offset="1" stop-color="#FFC331"/>
                                </linearGradient>
                            </defs>
                        </svg>
                        <span>${name}</span>
                        <div class="file-actions">
                            <button class="rename-file"><i class="fas fa-edit"></i></button>
                            <button class="delete-file"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;

                element.addEventListener('click', (e) => {
                    if (!e.target.closest('.file-actions')) {
                        // Désélectionner tous les autres fichiers
                        document.querySelectorAll('.file-item').forEach(el => {
                            el.classList.remove('active');
                            el.style.backgroundColor = '';
                        });
                        // Sélectionner ce fichier
                        element.classList.add('active');
                        switchFile(item.data);
                    }
                });

                // Gestionnaire pour renommer
                element.querySelector('.rename-file').addEventListener('click', (e) => {
                    e.stopPropagation();
                    renameFile(item.data.id);
                });

                // Gestionnaire pour supprimer
                element.querySelector('.delete-file').addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteFile(item.data.id);
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
    saveFilesToLocalStorage();
    updateLineCounter();
}

// Ajout d'une fonction pour sauvegarder le contenu actuel
function saveCurrentFile() {
    const codeEditor = document.getElementById('codeEditor');
    if (codeEditor && currentFile) {
        const currentIndex = files.findIndex(f => f.id === currentFile.id);
        if (currentIndex !== -1) {
            files[currentIndex].content = codeEditor.value;
            currentFile.content = codeEditor.value;
            saveFilesToLocalStorage();
        }
    }
}

const codeEditor = document.getElementById('codeEditor');
if (codeEditor) {
    codeEditor.addEventListener('input', () => {
        saveCurrentFile();
    });
}

// Pour la fermeture de la fenêtre
window.addEventListener('beforeunload', () => {
    saveCurrentFile();
});

export {
    loadFilesFromLocalStorage,
    saveFilesToLocalStorage,
    createNewFile,
    deleteFile,
    renameFile,
    switchFile,
    handleFileUpload,
    updateFileExplorer,
    saveCurrentFile
}; 