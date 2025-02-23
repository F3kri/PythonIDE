// Création de la fenêtre de chat
function createAIChatWindow() {
    const chatWindow = document.createElement('div');
    chatWindow.className = 'ai-chat-window';
    chatWindow.innerHTML = `
        <div id="loding">
            <div class="spinner">
                <div class="spinnerin"></div>
            </div>
        </div>
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
            <textarea id='ia-input' placeholder="En quoi puis-je t'aider ?"></textarea>
            <button class="send-message">
                <i class="fas fa-paper-plane"></i>
            </button>
        </div>
    `;
    document.body.appendChild(chatWindow);

    // Ajout du gestionnaire d'événements pour le bouton d'envoi
    const sendButton = chatWindow.querySelector('.send-message');
    sendButton.addEventListener('click', sendToIa);

    // Ajout de la fonctionnalité de déplacement
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

// Envoi du message à l'IA
async function sendToIa() {
    const message = document.getElementById('ia-input').value;
    const codeEditor = document.getElementById('codeEditor');
    const consoleContainer = document.getElementById('consoleOutput');

    document.getElementById('loding').style.display = 'flex';
    
    const chatMessages = document.querySelector('.chat-messages');
    chatMessages.innerHTML += `<div class="chat-message-user">${message}</div>`;

    const code = codeEditor ? codeEditor.value : "aucun code dans l'IDE";
    const consoleHTML = consoleContainer ? consoleContainer.innerHTML : "";

    const payload = {
        code: code.trim(),
        message: message.trim(),
        chatMessages: "",
        console: consoleHTML.trim()
    };

    try {
        const response = await fetch("https://lee-valuable-italiano-financing.trycloudflare.com/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Erreur: ${response.status}`);
        const data = await response.json();
        afficheResult(data);
    } catch (error) {
        console.error("Erreur lors de l'envoi du message:", error);
        afficheResult({ response: { parts: [{ text: "Une erreur est survenue lors de la communication avec l'IA." }] } });
    }
}

// Affichage du résultat
function afficheResult(result) {
    document.getElementById('loding').style.display = 'none';
    const responseText = result.response.parts[0].text;
    const chatMessages = document.querySelector('.chat-messages');

    const messageContainer = document.createElement('div');
    messageContainer.classList.add('chat-message-container');

    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');
    messageElement.innerHTML = `<br><br>` + marked.parse(responseText);

    messageContainer.appendChild(messageElement);

    // Ajout des boutons "Copier" aux blocs de code
    messageElement.querySelectorAll('pre code').forEach((codeBlock) => {
        const copyButton = document.createElement('button');
        copyButton.classList.add('copy-button');
        copyButton.textContent = '📋 Copier';

        copyButton.onclick = function () {
            navigator.clipboard.writeText(codeBlock.innerText).then(() => {
                copyButton.textContent = '✅ Copié !';
                setTimeout(() => (copyButton.textContent = '📋 Copier'), 2000);
            });
        };

        const pre = codeBlock.closest('pre');
        pre.style.position = 'relative';
        pre.insertBefore(copyButton, codeBlock);
    });

    chatMessages.appendChild(messageContainer);
    document.getElementById('ia-input').value = '';

    if (window.Prism) {
        Prism.highlightAll();
    }
}

// Initialisation du chat
function initializeChat() {
    const chatWindow = createAIChatWindow();
    let isChatVisible = false;

    const aiHelper = document.getElementById('aiHelper');
    aiHelper.addEventListener('click', () => {
        isChatVisible = !isChatVisible;
        chatWindow.style.display = isChatVisible ? 'flex' : 'none';
    });

    const closeChat = chatWindow.querySelector('.close-chat');
    closeChat.addEventListener('click', () => {
        chatWindow.style.display = 'none';
        isChatVisible = false;
    });

    const resetButton = chatWindow.querySelector('.reset-chat');
    resetButton.addEventListener('click', () => {
        const chatMessages = chatWindow.querySelector('.chat-messages');
        chatMessages.innerHTML = '';
    });

    const chatInput = document.querySelector('.chat-input textarea');
    if (!chatInput) return;

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {  // Entrée sans Shift
            e.preventDefault();  // Empêcher le saut de ligne
            const sendButton = document.querySelector('.chat-input button');
            if (sendButton) {
                sendButton.click();  // Simuler un clic sur le bouton d'envoi
            }
        }
        // Pour faire un saut de ligne, utiliser Shift + Entrée
    });
}

export {
    createAIChatWindow,
    sendToIa,
    afficheResult,
    initializeChat
}; 