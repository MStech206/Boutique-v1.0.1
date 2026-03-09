// Auto-scroll functionality for order form
(function() {
    'use strict';
    
    // Smooth scroll helper
    function smoothScrollTo(element, offset = -100) {
        if (!element) return;
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition + offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
    
    // Initialize auto-scroll on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', function() {
        
        // Customer info auto-scroll
        const checkAndShowCategory = () => {
            const name = document.getElementById('customerName');
            const phone = document.getElementById('customerPhone');
            const branch = document.getElementById('orderBranch');
            const categorySection = document.getElementById('categorySection');
            
            if (!name || !phone || !branch || !categorySection) return;
            
            if (name.value.length >= 2 && phone.value.length >= 10 && branch.value) {
                setTimeout(() => {
                    categorySection.style.display = 'block';
                    smoothScrollTo(categorySection);
                }, 300);
            }
        };
        
        const nameInput = document.getElementById('customerName');
        const phoneInput = document.getElementById('customerPhone');
        const branchSelect = document.getElementById('orderBranch');
        
        if (nameInput) nameInput.addEventListener('input', checkAndShowCategory);
        if (phoneInput) phoneInput.addEventListener('input', checkAndShowCategory);
        if (branchSelect) branchSelect.addEventListener('change', checkAndShowCategory);
        
        // Override selectCategory function
        window.selectCategory = function(category) {
            if (!window.currentOrder) window.currentOrder = {};
            window.currentOrder.category = category;
            
            document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
            const selectedBtn = document.querySelector(`[data-category="${category}"]`);
            if (selectedBtn) selectedBtn.classList.add('active');
            
            const kidsSubcategory = document.getElementById('kidsSubcategory');
            const garmentSelection = document.getElementById('garmentSelection');
            
            if (category === 'kids') {
                if (kidsSubcategory) {
                    kidsSubcategory.classList.remove('hidden');
                    setTimeout(() => smoothScrollTo(kidsSubcategory), 200);
                }
                if (garmentSelection) garmentSelection.classList.add('hidden');
            } else {
                if (kidsSubcategory) kidsSubcategory.classList.add('hidden');
                if (window.showGarmentSelection) window.showGarmentSelection(category);
            }
        };
        
        // Override selectSubcategory function
        window.selectSubcategory = function(subcategory) {
            if (!window.currentOrder) window.currentOrder = {};
            window.currentOrder.subcategory = subcategory;
            
            document.querySelectorAll('.subcategory-btn').forEach(btn => btn.classList.remove('active'));
            const selectedBtn = document.querySelector(`[data-subcategory="${subcategory}"]`);
            if (selectedBtn) selectedBtn.classList.add('active');
            
            if (window.showGarmentSelection) {
                window.showGarmentSelection(subcategory);
                const garmentSelection = document.getElementById('garmentSelection');
                if (garmentSelection) {
                    setTimeout(() => smoothScrollTo(garmentSelection), 200);
                }
            }
        };
        
        // Override showGarmentSelection to add auto-scroll
        const originalShowGarmentSelection = window.showGarmentSelection;
        window.showGarmentSelection = function(category) {
            if (originalShowGarmentSelection) {
                originalShowGarmentSelection(category);
            }
            const garmentSelection = document.getElementById('garmentSelection');
            if (garmentSelection) {
                setTimeout(() => smoothScrollTo(garmentSelection), 300);
            }
        };
        
        // Override selectGarment to add auto-scroll
        const originalSelectGarment = window.selectGarment;
        window.selectGarment = function(key, garment) {
            if (originalSelectGarment) {
                originalSelectGarment(key, garment);
            }
            const measurementSection = document.getElementById('measurementSection');
            if (measurementSection) {
                setTimeout(() => smoothScrollTo(measurementSection), 400);
            }
        };
        
        // Auto-scroll when design description is filled
        const designDescription = document.getElementById('designDescription');
        if (designDescription) {
            designDescription.addEventListener('blur', function() {
                if (this.value.length > 10) {
                    const pricingSection = document.getElementById('pricingSection');
                    if (pricingSection && pricingSection.style.display !== 'none') {
                        setTimeout(() => smoothScrollTo(pricingSection), 200);
                    }
                }
            });
        }
        
        console.log('✅ Order form auto-scroll initialized');
    });
})();
