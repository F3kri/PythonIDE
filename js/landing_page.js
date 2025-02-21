// Script principal
document.addEventListener('DOMContentLoaded', function () {
    // Animation d'écriture
    const text = "Développez et testez votre code Python directement depuis votre navigateur.";
    const typewriterElement = document.querySelector('.typewriter');
    typewriterElement.textContent = '';
    typewriterElement.classList.add('typing');

    let i = 0;
    function typeWriter() {
        if (i < text.length) {
            typewriterElement.textContent += text.charAt(i);
            i++;
            setTimeout(typeWriter, Math.random() * 50 + 50);
        } else {
            typewriterElement.classList.remove('typing');
        }
    }

    // Démarrer l'animation d'écriture après un délai
    setTimeout(typeWriter, 800);

    // Animation au scroll pour le formulaire de contact
    const contactSection = document.querySelector('#contact');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-section');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    observer.observe(contactSection);

    // Gestion du formulaire de contact
    const contactForm = document.querySelector('.contact-form');
    const submitButton = contactForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;

    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();

        // Vérifier si le formulaire est déjà en cours d'envoi
        if (submitButton.disabled) return;

        // Désactiver le bouton pendant l'envoi
        submitButton.disabled = true;
        submitButton.innerHTML = 'Envoi en cours...';

        // Récupérer les données du formulaire
        const formData = {
            name: this.querySelector('input[placeholder="Votre nom"]').value,
            email: this.querySelector('input[placeholder="votre@email.com"]').value,
            message: this.querySelector('textarea').value
        };

        // Ajouter un timeout de sécurité
        const timeout = setTimeout(() => {
            resetButton();
            submitButton.innerHTML = 'Erreur: délai dépassé';
            submitButton.classList.add('bg-red-500');
        }, 10000); // 10 secondes maximum

        // Envoyer l'email via EmailJS
        emailjs.send("service_k1m0cag", "template_8vo7nck", {
            from_name: formData.name,
            from_email: formData.email,
            message: formData.message
        })
            .then(function () {
                clearTimeout(timeout);
                // Succès
                submitButton.innerHTML = 'Message envoyé !';
                submitButton.classList.add('bg-green-500');

                // Réinitialiser le formulaire
                contactForm.reset();

                // Rétablir le bouton après 3 secondes
                setTimeout(resetButton, 3000);
            })
            .catch(function (error) {
                clearTimeout(timeout);
                // Erreur
                console.error('Erreur:', error);
                submitButton.innerHTML = 'Erreur d\'envoi';
                submitButton.classList.add('bg-red-500');

                // Rétablir le bouton après 3 secondes
                setTimeout(resetButton, 3000);
            });
    });

    // Fonction pour réinitialiser le bouton
    function resetButton() {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
        submitButton.classList.remove('bg-red-500', 'bg-green-500');
    }
});

// Ajouter cette fonction pour le scroll animé
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth',
        // Ajout d'une durée plus courte via CSS
    });
    document.documentElement.style.scrollBehavior = 'smooth';
    document.documentElement.style.scrollBehaviorDuration = '300ms';
}

// Initialiser EmailJS
(function () {
    emailjs.init("8EonlB2T-zTtcgelI");
})(); 