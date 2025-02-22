import { initPyodide, runPythonCode } from './pyodide.js';
import { loadFilesFromLocalStorage, saveFilesToLocalStorage, currentFile, files, updateFileExplorer, createNewFile, handleFileUpload } from './fileManager.js';
import { initializeEditor, updateCodeHighlighting } from './editor.js';
import { initializeSuggestions } from './suggestions.js';
import { initializeUI, checkMobileCompatibility } from './ui.js';
import { initializeChat } from './chat.js';

// Configuration des écouteurs d'événements
function setupEventListeners() {
    const elements = {
        codeEditor: document.getElementById('codeEditor'),
        runButton: document.getElementById('run'),
        saveButton: document.getElementById('save'),
        clearButton: document.getElementById('clear'),
        newFileButton: document.getElementById('newFile'),
        fileUploadInput: document.getElementById('file-upload'),
        consoleOutput: document.getElementById('consoleOutput')
    };

    // Vérification de tous les éléments nécessaires
    for (const [name, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Élément ${name} non trouvé dans le DOM`);
            return;
        }
    }

    // Gestion des fichiers avec debounce pour éviter les appels multiples
    let fileOperationTimeout;
    const handleFileOperation = (operation) => {
        clearTimeout(fileOperationTimeout);
        fileOperationTimeout = setTimeout(() => {
            try {
                operation();
                updateFileExplorer();
                updateCodeHighlighting();
                saveFilesToLocalStorage();
            } catch (error) {
                console.error('Erreur lors de l\'opération sur le fichier:', error);
            }
        }, 100);
    };

    // Nouveau fichier
    elements.newFileButton.addEventListener('click', () => {
        handleFileOperation(() => createNewFile('nouveau_fichier.py'));
    });

    // Import de fichier
    elements.fileUploadInput.addEventListener('change', (event) => {
        handleFileOperation(() => handleFileUpload(event));
    });

    // Exécution du code avec gestion des erreurs améliorée
    elements.runButton.addEventListener('click', async () => {
        try {
            elements.consoleOutput.innerHTML = '';
            elements.runButton.disabled = true;

            const result = await runPythonCode(elements.codeEditor.value);
            
            if (result.success) {
                if (result.output?.trim()) {
                    const lines = result.output.split('\n').filter(line => line.trim());
                    elements.consoleOutput.innerHTML = lines
                        .map(line => `<div class="output-message">${line}</div>`)
                        .join('');
                }
            } else {
                elements.consoleOutput.innerHTML = `<div class="error-message">${result.error || 'Erreur inconnue'}</div>`;
            }
        } catch (error) {
            console.error('Erreur lors de l\'exécution:', error);
            elements.consoleOutput.innerHTML = `<div class="error-message">Erreur lors de l'exécution: ${error.message}</div>`;
        } finally {
            elements.runButton.disabled = false;
        }
    });

    // Sauvegarde du fichier avec gestion des erreurs
    elements.saveButton.addEventListener('click', () => {
        try {
            const code = elements.codeEditor.value;
            const blob = new Blob([code], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = currentFile.name;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
        }
    });

    // Effacement du code avec confirmation
    elements.clearButton.addEventListener('click', () => {
        if (confirm('Voulez-vous vraiment effacer tout le code ?')) {
            elements.codeEditor.value = '';
            updateCodeHighlighting();
            updateLineCounter();
        }
    });

    // Sauvegarde automatique avec debounce
    let saveTimeout;
    elements.codeEditor.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            if (currentFile) {
                currentFile.content = elements.codeEditor.value;
                saveFilesToLocalStorage();
            }
        }, 500);
    });

    // Sauvegarde avant de quitter
    window.addEventListener('beforeunload', () => {
        if (currentFile) {
            currentFile.content = elements.codeEditor.value;
            saveFilesToLocalStorage();
        }
    });
}

// Initialisation de l'application avec gestion des erreurs améliorée
async function initializeApp() {
    const loadingScreen = document.getElementById('loading-screen');
    const loadingText = loadingScreen?.querySelector('.typing-text');
    let messageInterval;

    try {
        // Enregistrer le temps de début
        const startTime = Date.now();
        
        // Animation du loader avec plus de messages
        if (loadingText) {
            const messages = [
                'Chargement...',
                'Configuration de l\'environnement...',
                'Initialisation de Python...',
                'Chargement des fichiers...',
                'Configuration de l\'éditeur...',
                'Presque prêt...'
            ];
            let messageIndex = 0;
            messageInterval = setInterval(() => {
                loadingText.textContent = messages[messageIndex];
                messageIndex = (messageIndex + 1) % messages.length;
            }, 600); // Messages plus rapides pour voir plus de messages
        }

        // Vérification de la compatibilité mobile
        if (!checkMobileCompatibility()) {
            throw new Error('Appareil non compatible');
        }

        // Initialisation de l'interface utilisateur
        initializeUI();
        
        // Initialisation des composants essentiels
        await Promise.all([
            loadFilesFromLocalStorage(),
            initializeEditor(),
            initializeSuggestions()
        ]);

        // Initialisation des composants non-bloquants
        Promise.all([
            initPyodide(),
            initializeChat()
        ]).catch(error => {
            console.error('Erreur non critique:', error);
        });

        // Configuration finale
        updateFileExplorer();
        setupEventListeners();

        // Calculer le temps écoulé
        const elapsedTime = Date.now() - startTime;
        
        // S'assurer que le loader reste visible au moins 3.5 secondes
        if (elapsedTime < 3500) {
            await new Promise(resolve => setTimeout(resolve, 3500 - elapsedTime));
        }

    } catch (error) {
        console.error('Erreur critique lors de l\'initialisation:', error);
        if (loadingText) {
            loadingText.textContent = 'Erreur de chargement. Veuillez rafraîchir la page.';
        }
        // Attendre un peu même en cas d'erreur
        await new Promise(resolve => setTimeout(resolve, 3500));
    } finally {
        // Nettoyage avec transition plus douce
        clearInterval(messageInterval);
        if (loadingScreen) {
            loadingScreen.style.transition = 'opacity 0.8s ease, visibility 0.8s';
            loadingScreen.style.opacity = '0';
            await new Promise(resolve => setTimeout(resolve, 800));
            loadingScreen.style.visibility = 'hidden';
        }
        // Afficher le contenu
        document.body.classList.add('loaded');
    }
}

// Démarrage sécurisé de l'application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp().catch(error => {
        console.error('Erreur fatale:', error);
        alert('Une erreur est survenue lors du démarrage de l\'application. Veuillez rafraîchir la page.');
    });
});

export {
    initializeApp,
    setupEventListeners
}; 