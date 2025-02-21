document.addEventListener('DOMContentLoaded', function() {
    // Animation des questions FAQ
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            const arrow = question.querySelector('svg');
            
            // Toggle la réponse
            answer.classList.toggle('hidden');
            
            // Anime la flèche
            if (answer.classList.contains('hidden')) {
                arrow.style.transform = 'rotate(0deg)';
            } else {
                arrow.style.transform = 'rotate(180deg)';
            }
            
            // Ajoute l'effet de brillance
            question.classList.add('faq-glow');
            setTimeout(() => {
                question.classList.remove('faq-glow');
            }, 1000);
        });
    });
}); 