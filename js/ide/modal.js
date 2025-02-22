// Gestion des modales
export function createModal(title, content, onConfirm, type = 'input') {
    return new Promise((resolve) => {
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
            modalContent.innerHTML = content;
        }

        const actions = document.createElement('div');
        actions.className = 'modal-actions';

        if (type !== 'alert') {
            const cancelButton = document.createElement('button');
            cancelButton.className = 'modal-button secondary';
            cancelButton.textContent = 'Annuler';
            actions.appendChild(cancelButton);

            cancelButton.onclick = () => {
                overlay.classList.remove('active');
                setTimeout(() => document.body.removeChild(overlay), 300);
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

        if (type === 'colors') {
            confirmButton.onclick = () => {
                const colors = {
                    keywordColor: document.getElementById('keywordColor').value,
                    stringColor: document.getElementById('stringColor').value,
                    functionColor: document.getElementById('functionColor').value,
                    numberColor: document.getElementById('numberColor').value
                };
                overlay.classList.remove('active');
                setTimeout(() => document.body.removeChild(overlay), 300);
                resolve(colors);
            };
        } else {
            confirmButton.onclick = () => {
                const value = type === 'input' ? modalContent.querySelector('input').value : true;
                overlay.classList.remove('active');
                setTimeout(() => document.body.removeChild(overlay), 300);
                resolve(value);
            };
        }

        if (type !== 'alert') {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                    setTimeout(() => document.body.removeChild(overlay), 300);
                    resolve(null);
                }
            });
        }
    });
} 