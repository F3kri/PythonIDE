let pyodide = null;
let isWaitingForInput = false;

// Définir customInput globalement
globalThis.customInput = (promptText) => {
    if (isWaitingForInput) return;
    isWaitingForInput = true;

    const value = window.prompt(promptText);
    isWaitingForInput = false;
    
    if (value === null) {
        return "";
    }
    return value;
};

// Initialisation de Pyodide
async function initPyodide() {
    try {
        // Ajouter un timeout de 30 secondes
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Timeout lors du chargement de Pyodide")), 30000);
        });

        const loadingPromise = loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.21.3/full/"
        });

        // Utiliser Promise.race pour implémenter le timeout
        pyodide = await Promise.race([loadingPromise, timeoutPromise]);

        // Configuration de l'environnement Python
        await pyodide.runPythonAsync(`
            import sys
            from js import customInput
            
            def input(prompt_text=""):
                try:
                    return str(customInput(prompt_text))
                except Exception as e:
                    print(f"Erreur lors de l'input: {e}")
                    return ""
            
            def int_input(prompt_text=""):
                try:
                    val = customInput(prompt_text)
                    return int(val) if val.strip() else 0
                except Exception as e:
                    print(f"Erreur lors de l'int_input: {e}")
                    return 0
                
            # Remplacer les fonctions d'input globales
            globals()['input'] = input
            globals()['int_input'] = int_input
            __builtins__.input = input
            __builtins__.int_input = int_input
        `);

        return true;
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de Pyodide:', error);
        throw error; // Propager l'erreur pour la gestion dans main.js
    }
}

// Exécution du code Python
async function runPythonCode(code) {
    if (!pyodide) {
        return {
            success: false,
            error: "Pyodide n'est pas encore chargé. Veuillez patienter..."
        };
    }

    try {
        // Remplacer tous les int(input(...)) par int_input(...)
        code = code.replace(/int\(input\((.*?)\)\)/g, 'int_input($1)');

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

        return {
            success: true,
            output: output
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Fonction pour créer une zone d'entrée personnalisée
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

export {
    pyodide,
    isWaitingForInput,
    initPyodide,
    runPythonCode,
    createCustomPrompt
}; 