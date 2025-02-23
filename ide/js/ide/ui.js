import { syntaxColors } from './config.js';
import { updateSyntaxColors } from './editor.js';
import { createModal } from './modal.js';

// Gestion du thème
function initializeTheme() {
    // Forcer le thème sombre par défaut
    document.documentElement.style.setProperty('color-scheme', 'dark');
    document.body.setAttribute('data-theme', 'dark');
    
    // Marquer le body comme chargé pour activer la transition
    document.body.classList.add('loaded');
    
    const theme = localStorage.getItem('theme') || 'dark';
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) {
        console.error("Bouton de thème non trouvé");
        return;
    }

    const themeIcon = themeToggle.querySelector('i');
    themeIcon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';

    // Appliquer le thème sauvegardé
    document.body.setAttribute('data-theme', theme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeIcon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    });
}

// Gestion de la barre latérale
function initializeSidebar() {
    const toggleSidebarBtn = document.getElementById('toggleSidebar');
    const sidebar = document.querySelector('.sidebar');

    if (!toggleSidebarBtn || !sidebar) {
        console.error("Éléments de la barre latérale non trouvés");
        return;
    }

    toggleSidebarBtn.addEventListener('click', () => {
        const isCollapsed = sidebar.classList.toggle('collapsed');
        toggleSidebarBtn.querySelector('i').className = isCollapsed ?
            'fas fa-chevron-right' : 'fas fa-chevron-left';
    });
}

// Gestion de la console
function initializeConsole() {
    const toggleConsoleBtn = document.getElementById('toggleConsole');
    const consoleContainer = document.querySelector('.console');
    const editorContainer = document.querySelector('.editor-container');
    const clearConsoleBtn = document.getElementById('clearConsole');
    const maxConsoleBtn = document.getElementById('maxConsale');

    if (!toggleConsoleBtn || !consoleContainer || !editorContainer || !clearConsoleBtn || !maxConsoleBtn) {
        console.error("Éléments de la console non trouvés");
        return;
    }

    toggleConsoleBtn.addEventListener('click', () => {
        const isCollapsed = consoleContainer.classList.toggle('collapsed');
        toggleConsoleBtn.querySelector('i').className = isCollapsed ?
            'fas fa-chevron-up' : 'fas fa-chevron-down';
        editorContainer.style.flex = '1';
    });

    clearConsoleBtn.addEventListener('click', () => {
        document.getElementById('consoleOutput').innerHTML = '';
    });

    maxConsoleBtn.addEventListener('click', () => {
        const mainContent = document.querySelector('.main-content');
        const isCollapsed = mainContent.classList.toggle('collapsedm');
        maxConsoleBtn.querySelector('i').className = isCollapsed ?
            'fas fa-chevron-down' : 'fas fa-chevron-up';
    });
}

// Gestion de l'écran de chargement
function initializeLoadingScreen() {
    return new Promise((resolve) => {
        const loadingScreen = document.getElementById('loading-screen');
        if (!loadingScreen) {
            console.error("L'écran de chargement n'a pas été trouvé");
            resolve();
            return;
        }

        const loadingText = loadingScreen.querySelector('.typing-text');
        if (!loadingText) {
            console.error("Le texte de chargement n'a pas été trouvé");
            loadingScreen.style.display = 'none';
            resolve();
            return;
        }

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
            loadingScreen.style.opacity = '0';
            loadingScreen.style.visibility = 'hidden';
            resolve();
        }, 2400);
    });
}

// Vérification de la compatibilité mobile
function checkMobileCompatibility() {
    if (window.innerWidth <= 900) {
        alert('Le site est actuellement indisponible pour cette taille d\'écran');
        document.body.style.pointerEvents = 'none';
        
        const messageDiv = document.createElement('div');
        const messageDiv2 = document.createElement('div');
        
        messageDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            z-index:999999;
        `;

        messageDiv2.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 1.5rem;
            color: white;
            text-align: center;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
            background: rgba(0, 0, 0, 0.7);
            z-index: 1000000;
        `;
        
        messageDiv2.textContent = 'Le site est actuellement indisponible pour cette taille d\'écran';
        document.body.appendChild(messageDiv);
        messageDiv.appendChild(messageDiv2);
        return false;
    }
    return true;
}

// Gestion du thème de syntaxe
function initializeSyntaxTheme() {
    const syntaxThemeButton = document.getElementById('syntaxTheme');
    if (!syntaxThemeButton) {
        console.error("Bouton de thème de syntaxe non trouvé");
        return;
    }

    syntaxThemeButton.addEventListener('click', () => {
        createModal(
            'Syntaxe',
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
}

// Initialisation de l'interface utilisateur
function initializeUI() {
    initializeTheme();
    initializeSidebar();
    initializeConsole();
    initializeSyntaxTheme();
}

export {
    initializeUI,
    initializeTheme,
    initializeSidebar,
    initializeConsole,
    initializeLoadingScreen,
    checkMobileCompatibility
}; 