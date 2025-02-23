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
async function createNewFile(defaultName = 'Untitled.py') {
    // Trouver le prochain numéro disponible pour Untitled
    let nextNumber = 1;
    const untitledFiles = files.filter(f => f.name.startsWith('Untitled'));

    if (untitledFiles.length > 0) {
        const numbers = untitledFiles
            .map(f => {
                const match = f.name.match(/Untitled(?:_(\d+))?\.py/);
                return match ? parseInt(match[1] || '1') : 1;
            })
            .sort((a, b) => b - a);

        nextNumber = (numbers[0] || 0) + 1;
    }

    const suggestedName = nextNumber === 1 ? 'Untitled.py' : `Untitled_${nextNumber}.py`;
    const fileName = await createModal('Nouveau fichier', suggestedName);
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

    updateFileExplorer();
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
    const currentFileName = document.getElementById('currentFileName');
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

    // Mettre à jour currentFile si c'est le fichier actif
    if (currentFile.id === fileId) {
        currentFile.name = file.name;
        if (currentFileName) {
            currentFileName.textContent = file.name;
        }
    }

    updateFileExplorer();
    saveFilesToLocalStorage();

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
        updateLineCounter();
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
async function updateFileExplorer() {
    // Vérifier s'il n'y a aucun fichier
    if (files.length === 0) {
        const defaultFile = {
            id: Date.now(),
            name: 'Untitled.py',
            content: 'print("Hello World !")'
        };
        files.push(defaultFile);
        Object.assign(currentFile, defaultFile);

        const codeEditor = document.getElementById('codeEditor');
        if (codeEditor) {
            codeEditor.value = defaultFile.content;
            updateCodeHighlighting();
        }
    }

    updateLineCounter();
    const fragment = document.createDocumentFragment();
    document.getElementById('currentFileName').textContent = currentFile.name;

    // Séparer les fichiers et les dossiers
    const folders = files.filter(item => item.type === 'folder');
    const rootFiles = files.filter(item => !item.type && !item.path);
    const filesInFolders = files.filter(item => !item.type && item.path);

    // Trier par ordre
    const sortByOrder = (a, b) => (a.order || 0) - (b.order || 0);
    folders.sort(sortByOrder);
    rootFiles.sort(sortByOrder);

    // Créer les éléments de dossier
    folders.forEach(folder => {
        const folderElement = document.createElement('div');
        folderElement.className = 'folder-item';
        folderElement.style.paddingLeft = '1.2rem';
        folderElement.innerHTML = `
            <div class="folder-header">
                <i class="fas ${folder.isOpen ? 'fa-folder-open' : 'fa-folder'}"></i>
                <div class="drag-handle">⋮⋮</div>
                <span>${folder.name}</span>
               <div class="folder-actions">
                <button class="rename-folder"><i class="fas fa-edit"></i></button>
                <button class="delete-folder"><i class="fas fa-trash"></i></button>
            </div>
            </div>
            <div class="folder-content" ${folder.isOpen ? '' : 'style="display: none;"'}></div>
        `;

        // Gestion du drag & drop pour le dossier
        folderElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            folderElement.classList.add('drag-over');
        });

        folderElement.addEventListener('dragleave', () => {
            folderElement.classList.remove('drag-over');
        });

        folderElement.addEventListener('drop', (e) => {
            e.preventDefault();
            folderElement.classList.remove('drag-over');

            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (data.type === 'file') {
                const file = files.find(f => f.id === parseInt(data.id));
                if (file) {
                    file.path = folder.name;
                    file.order = Date.now();
                    updateFileExplorer();
                    saveFilesToLocalStorage();
                }
            }
        });

        // Toggle folder
        const folderHeader = folderElement.querySelector('.folder-header');
        folderHeader.addEventListener('click', (e) => {
            if (!e.target.closest('.folder-actions')) {
                folder.isOpen = !folder.isOpen;
                const content = folderElement.querySelector('.folder-content');
                const icon = folderElement.querySelector('.fas');
                content.style.display = folder.isOpen ? 'block' : 'none';
                icon.classList.toggle('fa-folder-open');
                icon.classList.toggle('fa-folder');
                saveFilesToLocalStorage();
            }
        });

        // Renommer le dossier
        folderElement.querySelector('.rename-folder').addEventListener('click', async (e) => {
            e.stopPropagation();
            const newName = await createModal('Renommer le dossier', folder.name);
            if (newName && newName !== folder.name && newName.length <= 16) {
                const oldName = folder.name;
                folder.name = newName;
                // Mettre à jour les chemins des fichiers
                filesInFolders.forEach(file => {
                    if (file.path === oldName) {
                        file.path = newName;
                    }
                });
                updateFileExplorer();
                saveFilesToLocalStorage();
            }
        });

        // Supprimer le dossier
        folderElement.querySelector('.delete-folder').addEventListener('click', async (e) => {
            e.stopPropagation();
            const hasFiles = filesInFolders.some(file => file.path === folder.name);
            if (hasFiles) {
                const confirmed = await createModal(
                    'Supprimer le dossier',
                    'Ce dossier contient des fichiers. Voulez-vous vraiment le supprimer ?',
                    null,
                    'confirm'
                );
                if (!confirmed) return;
            }

            // Supprimer le dossier et tous les fichiers qu'il contient
            files = files.filter(f => f !== folder && f.path !== folder.name);

            updateFileExplorer();
            saveFilesToLocalStorage();
        });

        // Ajouter les fichiers du dossier
        const folderContent = folderElement.querySelector('.folder-content');
        const folderFiles = filesInFolders.filter(file => file.path === folder.name);
        folderFiles.sort(sortByOrder);

        folderFiles.forEach(file => {
            const fileElement = createFileElement(file);
            folderContent.appendChild(fileElement);
        });

        fragment.appendChild(folderElement);
    });

    // Ajouter les fichiers racine
    rootFiles.forEach(file => {
        const fileElement = createFileElement(file);
        fragment.appendChild(fileElement);
    });

    const fileExplorer = document.getElementById('fileExplorer');
    fileExplorer.innerHTML = '';
    fileExplorer.appendChild(fragment);

    // Ajouter les gestionnaires pour permettre le drop sur la racine
    fileExplorer.addEventListener('dragover', (e) => {
        e.preventDefault();
        // Ne montrer la zone de drop que si on n'est pas au-dessus d'un dossier
        if (!e.target.closest('.folder-item')) {
            fileExplorer.classList.add('drag-over');
        }
    });

    fileExplorer.addEventListener('dragleave', (e) => {
        e.preventDefault();
        if (!e.target.closest('.folder-item')) {
            fileExplorer.classList.remove('drag-over');
        }
    });

    fileExplorer.addEventListener('drop', (e) => {
        e.preventDefault();
        fileExplorer.classList.remove('drag-over');

        // Si on drop sur un dossier, laisser le gestionnaire du dossier s'en occuper
        if (e.target.closest('.folder-item')) {
            return;
        }

        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (data.type === 'file') {
                const file = files.find(f => f.id === parseInt(data.id));
                if (file) {
                    // Supprimer le chemin pour mettre le fichier à la racine
                    delete file.path;
                    file.order = Date.now();
                    updateFileExplorer();
                    saveFilesToLocalStorage();
                }
            }
        } catch (error) {
            console.error('Erreur lors du drop sur fileExplorer:', error);
        }
    });

    saveFilesToLocalStorage();
}

// Fonction helper pour créer un élément de fichier
function createFileElement(file) {
    const element = document.createElement('div');
    element.className = 'file-item';
    element.draggable = true;
    element.dataset.fileId = String(file.id);
    element.dataset.type = 'file';
    element.style.paddingLeft = file.path ? '2rem' : '1.2rem';

    if (currentFile && currentFile.id === file.id) {
        element.classList.add('active');
    }

    element.innerHTML = `
        <div class="file-content">
            <img src="../assets/python_ico.png" alt="Python" class="file-icon">
            <div class="drag-handle">⋮⋮</div>
            <span>${file.name}</span>
            <div class="file-actions">
                <button class="rename-file"><i class="fas fa-edit"></i></button>
                <button class="delete-file"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `;

    // Ajouter les gestionnaires d'événements pour les boutons
    element.querySelector('.delete-file').addEventListener('click', async (e) => {
        e.stopPropagation();
        await deleteFile(file.id);
    });

    element.querySelector('.rename-file').addEventListener('click', async (e) => {
        e.stopPropagation();
        await renameFile(file.id);
    });

    element.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({
            type: 'file',
            id: file.id
        }));
    });

    element.addEventListener('click', (e) => {
        if (!e.target.closest('.file-actions')) {
            document.querySelectorAll('.file-item').forEach(el => {
                el.classList.remove('active');
            });
            element.classList.add('active');
            switchFile(file);
        }
    });

    return element;
}

// Création d'un nouveau dossier
async function createNewFolder() {
    // Trouver le prochain numéro disponible pour les dossiers
    let nextNumber = 1;
    const existingFolders = files.filter(f => f.type === 'folder' && f.name.startsWith('Folder'));

    if (existingFolders.length > 0) {
        const numbers = existingFolders
            .map(f => {
                const match = f.name.match(/Folder(?:_(\d+))?/);
                return match ? parseInt(match[1] || '1') : 1;
            })
            .sort((a, b) => b - a);

        nextNumber = (numbers[0] || 0) + 1;
    }

    const suggestedName = nextNumber === 1 ? 'Folder' : `Folder_${nextNumber}`;
    const folderName = await createModal('Nouveau dossier', suggestedName);
    if (!folderName) return;

    if (folderName.length > 16) {
        alert("Le nom du dossier ne doit pas dépasser 16 caractères");
        return;
    }

    if (files.some(f => f.type === 'folder' && f.name === folderName)) {
        alert("Un dossier avec ce nom existe déjà");
        return;
    }

    const newFolder = {
        id: Date.now(),
        name: folderName,
        type: 'folder',
        isOpen: true,
        order: Date.now()
    };

    files.push(newFolder);
    updateFileExplorer();
    saveFilesToLocalStorage();
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

const newFolderButton = document.getElementById('newFolder');
if (newFolderButton) {
    newFolderButton.addEventListener('click', createNewFolder);
}

// Fonction pour déplacer un fichier dans un dossier
function moveFileToFolder(fileId, folderPath) {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    file.path = folderPath + '/' + file.name;
    updateFileExplorer();
    saveFilesToLocalStorage();
}

export {
    loadFilesFromLocalStorage,
    saveFilesToLocalStorage,
    createNewFile,
    createNewFolder,
    deleteFile,
    renameFile,
    switchFile,
    handleFileUpload,
    updateFileExplorer,
    saveCurrentFile
};