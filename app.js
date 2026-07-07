/* -------------------------------------------------------------
   CCTV AAA Solusi Landing Page JS
   Functions: Mobile Nav Toggle, Active Scroll Link, Sticky Nav,
              and Dynamic WhatsApp Form Integration.
------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {

    // 1. WhatsApp Configuration
    const WHATSAPP_NUMBER = '6285888098639'; // Change to actual business WhatsApp number

    // 2. Mobile Navigation Toggle
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            const icon = menuToggle.querySelector('i');
            if (navMenu.classList.contains('active')) {
                icon.className = 'fas fa-times';
            } else {
                icon.className = 'fas fa-bars';
            }
        });

        // Close menu when link is clicked
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                menuToggle.querySelector('i').className = 'fas fa-bars';
            });
        });
    }

    // 3. Header Sticky Styling on Scroll
    const header = document.querySelector('.header');
    
    const checkHeaderSticky = () => {
        if (window.scrollY > 50) {
            header.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.4)';
            header.style.padding = '12px 0';
            header.style.backgroundColor = 'rgba(6, 9, 18, 0.95)';
        } else {
            header.style.boxShadow = 'none';
            header.style.padding = '16px 0';
            header.style.backgroundColor = 'rgba(10, 15, 29, 0.8)';
        }
    };

    window.addEventListener('scroll', checkHeaderSticky);
    checkHeaderSticky(); // Run once initially

    // 4. Active Navigation Links Highlighting on Scroll
    const sections = document.querySelectorAll('section[id]');
    
    const highlightNavOnScroll = () => {
        const scrollPosition = window.scrollY + 120; // Offset for sticky header
        
        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                document.querySelector(`.nav-link[href*="${sectionId}"]`)?.classList.add('active');
            } else {
                document.querySelector(`.nav-link[href*="${sectionId}"]`)?.classList.remove('active');
            }
        });
    };

    window.addEventListener('scroll', highlightNavOnScroll);

    // 5. WhatsApp Consultation Form Handler
    const consultationForm = document.getElementById('consultationForm');
    
    if (consultationForm) {
        consultationForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent standard page submission
            
            // Get form field values
            const name = document.getElementById('name').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const location = document.getElementById('location').value.trim();
            const selectedPackage = document.getElementById('package').value;
            const message = document.getElementById('message').value.trim();
            
            // Form validation check
            if (!name || !phone || !location || !selectedPackage) {
                alert('Tolong lengkapi semua kolom yang wajib diisi.');
                return;
            }
            
            // Build the formatted WhatsApp message
            let waMessage = `Halo CCTV AAA Solusi, \n\n`;
            waMessage += `Saya ingin mengajukan Konsultasi Gratis mengenai Pemasangan CCTV. Berikut rincian data saya:\n\n`;
            waMessage += `👤 *Nama:* ${name}\n`;
            waMessage += `📞 *No. WhatsApp:* ${phone}\n`;
            waMessage += `📍 *Lokasi/Kecamatan:* ${location}\n`;
            waMessage += `📦 *Paket Diminati:* ${selectedPackage}\n`;
            
            if (message) {
                waMessage += `📝 *Catatan Tambahan:* ${message}\n`;
            } else {
                waMessage += `📝 *Catatan Tambahan:* (Tidak ada)\n`;
            }
            
            waMessage += `\nTerima kasih. Mohon segera hubungi saya kembali untuk survei lokasi/konsultasi.`;
            
            // Encode message for URL parameters
            const encodedText = encodeURIComponent(waMessage);
            
            // Redirect link to WhatsApp API
            const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedText}`;
            
            // Open WA in a new tab
            window.open(waUrl, '_blank');
        });
    }

    // 5.5 CCTV Packages Slider Logic
    const packagesGrid = document.getElementById('packagesGrid');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const sliderDotsContainer = document.getElementById('sliderDots');

    if (packagesGrid && prevBtn && nextBtn && sliderDotsContainer) {
        const cards = packagesGrid.querySelectorAll('.pkg-card');
        const cardCount = cards.length;

        // Generate dot elements
        for (let i = 0; i < cardCount; i++) {
            const dot = document.createElement('div');
            dot.classList.add('slider-dot');
            if (i === 0) dot.classList.add('active');
            
            // Click on dot scrolls to specific card
            dot.addEventListener('click', () => {
                const cardWidth = cards[0].offsetWidth + 24; // Card width + gap (24px)
                packagesGrid.scrollTo({
                    left: i * cardWidth,
                    behavior: 'smooth'
                });
            });
            sliderDotsContainer.appendChild(dot);
        }

        const dots = sliderDotsContainer.querySelectorAll('.slider-dot');

        // Scroll listener to update active dots
        const updateDots = () => {
            const cardWidth = cards[0].offsetWidth + 24;
            const scrollLeft = packagesGrid.scrollLeft;
            const activeIndex = Math.round(scrollLeft / cardWidth);

            dots.forEach((dot, index) => {
                if (index === activeIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        };

        packagesGrid.addEventListener('scroll', updateDots);

        // Next and Prev Button Events
        nextBtn.addEventListener('click', () => {
            const cardWidth = cards[0].offsetWidth + 24;
            packagesGrid.scrollBy({
                left: cardWidth,
                behavior: 'smooth'
            });
        });

        prevBtn.addEventListener('click', () => {
            const cardWidth = cards[0].offsetWidth + 24;
            packagesGrid.scrollBy({
                left: -cardWidth,
                behavior: 'smooth'
            });
        });
        
        // Handle window resizing to make sure calculations remain correct
        window.addEventListener('resize', updateDots);
    }

    // 6. Smooth Scroll for Anchor Links (Polite backup)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                const offsetPosition = targetElement.offsetTop - 80; // Offset for header height
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

});
