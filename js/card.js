class StoryCarousel {
    constructor(cardElement) {
        this.card = cardElement;
        this.images = cardElement.dataset.images.split(',');
        this.bgColor = cardElement.dataset.bgColor || '#64E3EB';
        this.currentIndex = 0;
        this.autoAdvanceInterval = null;
        this.preloadedImages = new Map(); // Cache for loaded images
        this.setupCardProps();
        this.init();
    }


    setupCardProps() {
        this.carouselBg = cardElement.querySelector('.carousel-background');
        this.carouselImg = cardElement.querySelector('.carousel-image');
        this.progressBar = cardElement.querySelector('.progress-bar');
        this.prevBtn = cardElement.querySelector('.prev-btn');
        this.nextBtn = cardElement.querySelector('.next-btn');
        this.container = cardElement.querySelector('.carousel-container');
    }
    
    init() {
        this.insertCarouselContainer();
        this.setupEventListeners();
        this.preloadImages().then(() => {
            this.updateCarousel();
            this.startAutoAdvance();
        });
    }

    // helper function to keep card clean
    insertCarouselContainer() {

        if (this.container) { return }

        const div = document.createElement("div");
        div.classList.add("carousel-container");
        div.style.position = "relative";
        div.innerHTML = `
            <div class="carousel-background" style="background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 60%, #FF6B6B 100%); background-size: cover; background-position: center; transition: background-image 0.8s ease-in-out;">
                <img class="carousel-image" alt="Story Image" style="width: 100%; height: 100%; object-fit: cover; opacity: 0;">
            </div>
            <button class="nav-btn prev-btn" style="position: absolute; top: 50%; left: 15px; transform: translateY(-50%); background: rgba(0, 0, 0, 0.3); border: none; border-radius: 3px; width: 30px; height: 30px; font-size: 16px; cursor: pointer; color: white; opacity: 0; transition: opacity 0.3s ease; display: flex; align-items: center; justify-content: center;">
                ‹
            </button>
            <button class="nav-btn next-btn" style="position: absolute; top: 50%; right: 15px; transform: translateY(-50%); background: rgba(0, 0, 0, 0.3); border: none; border-radius: 3px; width: 30px; height: 30px; font-size: 16px; cursor: pointer; color: white; opacity: 0; transition: opacity 0.3s ease; display: flex; align-items: center; justify-content: center;">
                ›
            </button>
            <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; background: rgba(255, 255, 255, 0.1);">
                <div class="progress-bar" style="height: 100%; background: rgba(255, 255, 255, 0.3); width: 50%; transition: width 0.8s ease;"></div>
            </div>
        `;
        this.card.prepend(div);
        this.setupCardProps();
    }

    
    setupEventListeners() {
        this.prevBtn.addEventListener('click', () => this.prevImage());
        this.nextBtn.addEventListener('click', () => this.nextImage());
        
        // Show/hide navigation on hover
        this.container.addEventListener('mouseenter', () => {
            this.prevBtn.style.opacity = '1';
            this.nextBtn.style.opacity = '1';
        });
        
        this.container.addEventListener('mouseleave', () => {
            this.prevBtn.style.opacity = '0';
            this.nextBtn.style.opacity = '0';
        });
        
        // Pause auto-advance on hover
        this.card.addEventListener('mouseenter', () => this.pauseAutoAdvance());
        this.card.addEventListener('mouseleave', () => this.startAutoAdvance());
    }
    
    updateCarousel() {
        const currentImageUrl = this.images[this.currentIndex];
        
        // Only update if image is preloaded to avoid repeated requests
        if (this.preloadedImages.has(currentImageUrl)) {
            this.carouselBg.style.backgroundImage = `linear-gradient(to bottom, rgba(0, 0, 0, 0) 60%, ${this.bgColor} 100%), url('${currentImageUrl}')`;
            this.carouselImg.src = currentImageUrl;
        }
        
        // Update progress bar
        const progressWidth = ((this.currentIndex + 1) / this.images.length) * 100;
        this.progressBar.style.width = progressWidth + '%';
    }
    
    nextImage() {
        this.currentIndex = (this.currentIndex + 1) % this.images.length;
        this.updateCarousel();
    }
    
    prevImage() {
        this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
        this.updateCarousel();
    }
    
    startAutoAdvance() {
        this.pauseAutoAdvance();
        this.autoAdvanceInterval = setInterval(() => this.nextImage(), 6000);
    }
    
    pauseAutoAdvance() {
        if (this.autoAdvanceInterval) {
            clearInterval(this.autoAdvanceInterval);
            this.autoAdvanceInterval = null;
        }
    }
    
    preloadImages() {
        return Promise.all(
            this.images.map(src => {
                return new Promise((resolve) => {
                    if (this.preloadedImages.has(src)) {
                        resolve();
                        return;
                    }
                    
                    const img = new Image();
                    img.onload = () => {
                        this.preloadedImages.set(src, true);
                        resolve();
                    };
                    img.onerror = () => {
                        console.warn(`Failed to load image: ${src}`);
                        resolve(); // Continue even if image fails
                    };
                    img.src = src;
                });
            })
        );
    }
}

// Initialize all story cards
function initializeStoryCarousels() {
    document.querySelectorAll('.story-card').forEach(card => {
        new StoryCarousel(card);
    });
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeStoryCarousels);
} else {
    initializeStoryCarousels();
}

// Function to add new cards dynamically
function addStoryCard(cardElement) {
    new StoryCarousel(cardElement);
}

// Expose for global use
window.StoryCarousel = StoryCarousel;
window.addStoryCard = addStoryCard;