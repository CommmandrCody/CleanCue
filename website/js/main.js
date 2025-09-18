// Smooth scrolling for navigation links
document.addEventListener('DOMContentLoaded', function() {
    // Add fade-in animation to sections as they come into view
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);

    // Observe all sections
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        observer.observe(section);
    });

    // Download tracking (for analytics if needed later)
    const downloadButtons = document.querySelectorAll('a[href*="releases/download"]');
    downloadButtons.forEach(button => {
        button.addEventListener('click', function() {
            const platform = this.textContent.includes('Intel') ? 'mac-intel' :
                           this.textContent.includes('Apple') ? 'mac-arm' :
                           this.textContent.includes('64-bit') ? 'win-64' :
                           this.textContent.includes('32-bit') ? 'win-32' :
                           this.textContent.includes('Universal') ? 'win-universal' : 'unknown';

            // Could add analytics tracking here later
            console.log(`Download started: ${platform}`);
        });
    });

    // Add hover effects to feature cards
    const featureCards = document.querySelectorAll('.feature-card, .download-card');
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px)';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Navbar background on scroll
    const nav = document.querySelector('.nav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            nav.style.background = 'rgba(255, 255, 255, 0.98)';
            nav.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
        } else {
            nav.style.background = 'rgba(255, 255, 255, 0.95)';
            nav.style.boxShadow = 'none';
        }
    });

    // Copy to clipboard functionality (could be useful for GitHub links)
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(function() {
            // Could show a toast notification here
            console.log('Copied to clipboard:', text);
        });
    }

    // Add click handlers for GitHub links
    const githubLinks = document.querySelectorAll('a[href*="github.com"]');
    githubLinks.forEach(link => {
        link.addEventListener('click', function() {
            console.log('GitHub link clicked:', this.href);
        });
    });

    // Simple form validation if contact form is added later
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Performance monitoring - track page load time
    window.addEventListener('load', function() {
        const loadTime = performance.now();
        console.log(`Page loaded in ${Math.round(loadTime)}ms`);
    });

    // Add keyboard navigation support
    document.addEventListener('keydown', function(e) {
        // ESC to close any modals (if added later)
        if (e.key === 'Escape') {
            // Close any open modals
        }

        // Add keyboard shortcuts for power users
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'd':
                    // Ctrl/Cmd + D to go to downloads
                    e.preventDefault();
                    document.getElementById('download').scrollIntoView({ behavior: 'smooth' });
                    break;
                case 'g':
                    // Ctrl/Cmd + G to go to GitHub
                    e.preventDefault();
                    window.open('https://github.com/CommmandrCody/CleanCue', '_blank');
                    break;
            }
        }
    });
});

// Utility functions
const utils = {
    // Debounce function for scroll events
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Format file sizes
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    },

    // Check if user is on mobile
    isMobile() {
        return window.innerWidth <= 768;
    },

    // Get user's operating system
    getOS() {
        const userAgent = window.navigator.userAgent;
        if (userAgent.indexOf('Win') !== -1) return 'Windows';
        if (userAgent.indexOf('Mac') !== -1) return 'macOS';
        if (userAgent.indexOf('Linux') !== -1) return 'Linux';
        return 'Unknown';
    }
};

// Auto-highlight the appropriate download button based on user's OS
document.addEventListener('DOMContentLoaded', function() {
    const userOS = utils.getOS();
    const downloadCards = document.querySelectorAll('.download-card');

    downloadCards.forEach(card => {
        const title = card.querySelector('h3').textContent;
        if ((userOS === 'macOS' && title === 'macOS') ||
            (userOS === 'Windows' && title === 'Windows')) {
            card.style.border = '2px solid var(--primary-color)';
            card.style.background = '#f8faff';
        }
    });
});

// Export utils for potential use elsewhere
window.CleanCueUtils = utils;