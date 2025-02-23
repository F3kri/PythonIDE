document.addEventListener('DOMContentLoaded', () => {
    // Gestion des questions/réponses
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.question');
        
        question.addEventListener('click', () => {
            // Fermer les autres questions
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });
            
            // Toggle l'état actif
            item.classList.toggle('active');
        });
    });
}); 