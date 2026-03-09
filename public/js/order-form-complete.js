// Complete Order Form Logic with Category Selection Fix
(function() {
    'use strict';
    
    // Global order state
    window.currentOrder = {
        customer: {},
        category: '',
        subcategory: '',
        garment: null,
        measurements: {},
        design: {},
        pricing: { basePrice: 0, addonPrice: 0, discount: 0, total: 0 },
        images: []
    };
    
    // Garment categories data
    const GARMENT_CATEGORIES = {
        men: {
            'business-shirt': { name: 'Business Shirt', price: 1200, measurements: ['C', 'SH', 'L'] },
            'casual-shirt': { name: 'Casual Shirt', price: 900, measurements: ['C', 'SH', 'L'] },
            'men-kurta': { name: 'Men Kurta', price: 800, measurements: ['KL', 'C', 'W'] },
            'formal-trouser': { name: 'Formal Trouser', price: 1000, measurements: ['PL', 'PW'] }
        },
        women: {
            'cross-cut-blouse': { name: 'Cross Cut Blouse', price: 850, measurements: ['BL', 'B', 'W', 'SH'] },
            'silk-kurthi': { name: 'Silk Kurthi', price: 850, measurements: ['KL', 'B', 'W'] },
            'designer-lehenga': { name: 'Designer Lehenga', price: 3500, measurements: ['LL', 'LW', 'B'] },
            'party-frock': { name: 'Party Frock', price: 2400, measurements: ['FL', 'B', 'W'] }
        },
        boys: {
            'school-shirt': { name: 'School Shirt', price: 700, measurements: ['C', 'L'] },
            'boys-kurta': { name: 'Boys Kurta', price: 800, measurements: ['KL', 'C'] }
        },
        girls: {
            'birthday-frock': { name: 'Birthday Frock', price: 1350, measurements: ['FL', 'C'] },
            'princess-lehenga': { name: 'Princess Lehenga', price: 1300, measurements: ['LL', 'LW'] }
        }
    };
    
    const MEASUREMENT_LABELS = {
        'BL': 'Blouse Length', 'B': 'Bust', 'W': 'Waist', 'SH': 'Shoulder',
        'LL': 'Lehenga Length', 'LW': 'Lehenga Waist', 'FL': 'Frock Length',
        'KL': 'Kurta Length', 'PL': 'Pant Length', 'PW': 'Pant Waist', 'C': 'Chest', 'L': 'Length'
    };
    
    // Initialize on DOM load
    document.addEventListener('DOMContentLoaded', function() {
        initializeOrderForm();
    });
    
    function initializeOrderForm() {
        // Category button handlers
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                selectCategory(this.dataset.category);
            });
        });
        
        // Subcategory button handlers
        document.querySelectorAll('.subcategory-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                selectSubcategory(this.dataset.subcategory);
            });
        });
        
        console.log('✅ Order form initialized');
    }
    
    function selectCategory(category) {
        window.currentOrder.category = category;
        
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        const selectedBtn = document.querySelector(`[data-category="${category}"]`);
        if (selectedBtn) selectedBtn.classList.add('active');
        
        const kidsSubcategory = document.getElementById('kidsSubcategory');
        const garmentSelection = document.getElementById('garmentSelection');
        
        if (category === 'kids') {
            if (kidsSubcategory) {
                kidsSubcategory.classList.remove('hidden');
                setTimeout(() => kidsSubcategory.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
            }
            if (garmentSelection) garmentSelection.classList.add('hidden');
        } else {
            if (kidsSubcategory) kidsSubcategory.classList.add('hidden');
            showGarmentSelection(category);
        }
    }
    
    function selectSubcategory(subcategory) {
        window.currentOrder.subcategory = subcategory;
        
        document.querySelectorAll('.subcategory-btn').forEach(btn => btn.classList.remove('active'));
        const selectedBtn = document.querySelector(`[data-subcategory="${subcategory}"]`);
        if (selectedBtn) selectedBtn.classList.add('active');
        
        showGarmentSelection(subcategory);
        const garmentSelection = document.getElementById('garmentSelection');
        if (garmentSelection) {
            setTimeout(() => garmentSelection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
        }
    }
    
    function showGarmentSelection(category) {
        const garments = GARMENT_CATEGORIES[category];
        if (!garments) return;
        
        const container = document.getElementById('garmentButtons');
        if (!container) return;
        
        container.innerHTML = '';
        
        Object.keys(garments).forEach(key => {
            const garment = garments[key];
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'garment-btn';
            btn.innerHTML = `
                <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">${garment.name}</div>
                <div style="color: #10b981; font-weight: bold; font-size: 18px;">₹${garment.price}</div>
            `;
            btn.onclick = () => selectGarment(key, garment);
            container.appendChild(btn);
        });
        
        const garmentSelection = document.getElementById('garmentSelection');
        if (garmentSelection) {
            garmentSelection.classList.remove('hidden');
            setTimeout(() => garmentSelection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
        }
    }
    
    function selectGarment(arg1, arg2, evt) {
        // Support both calling conventions used across pages/scripts:
        //  - selectGarment(category, garmentKey)
        //  - selectGarment(garmentKey, garmentObj)
        //  - selectGarment(garmentKey, garmentObj, event)
        let garmentKey = null;
        let garmentObj = null;
        let category = null;

        if (typeof arg2 === 'string' || typeof arg2 === 'undefined') {
            // Called as (category, garmentKey) OR (garmentKey)
            if (typeof arg2 === 'string') {
                category = arg1;
                garmentKey = arg2;
                garmentObj = (GARMENT_CATEGORIES[category] && GARMENT_CATEGORIES[category][garmentKey]) || null;
            } else {
                // single-arg form: try to find across categories
                garmentKey = arg1;
                for (const c in GARMENT_CATEGORIES) {
                    if (GARMENT_CATEGORIES[c] && GARMENT_CATEGORIES[c][garmentKey]) { garmentObj = GARMENT_CATEGORIES[c][garmentKey]; category = c; break; }
                }
            }
        } else if (typeof arg2 === 'object' && arg2 !== null) {
            garmentKey = arg1;
            garmentObj = arg2;
        } else {
            garmentKey = String(arg1);
        }

        // Ensure global order object exists
        if (!window.currentOrder) window.currentOrder = { customer: {}, category: '', subcategory: '', garment: null, measurements: {}, design: {}, pricing: {}, images: [] };

        window.currentOrder.garment = garmentObj ? { key: garmentKey, ...garmentObj } : { key: garmentKey, name: garmentKey, price: 0, measurements: [] };

        // Manage active UI state
        document.querySelectorAll('.garment-btn').forEach(btn => btn.classList.remove('active'));
        let targetBtn = null;
        if (evt && evt.target) targetBtn = evt.target.closest('.garment-btn');
        if (!targetBtn) targetBtn = document.querySelector(`[data-garment="${garmentKey}"]`);
        if (targetBtn) targetBtn.classList.add('active');

        // Show measurement + pricing
        const measurementSection = document.getElementById('measurementSection');
        if (measurementSection) {
            measurementSection.style.display = 'block';
            generateMeasurementFields(window.currentOrder.garment.measurements || []);
            setTimeout(() => measurementSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
        }

        const pricingSection = document.getElementById('pricingSection');
        if (pricingSection) pricingSection.style.display = 'block';

        window.currentOrder.pricing = window.currentOrder.pricing || {};
        window.currentOrder.pricing.basePrice = window.currentOrder.garment.price || 0;
        if (window.calculateTotal) window.calculateTotal();
    }
    
    function generateMeasurementFields(measurements) {
        const container = document.getElementById('measurementFields');
        if (!container) return;
        
        container.innerHTML = '';
        
        measurements.forEach(code => {
            const label = MEASUREMENT_LABELS[code] || code;
            const field = document.createElement('div');
            field.className = 'measurement-field';
            field.innerHTML = `
                <label>${label} (${code})</label>
                <input type="number" id="measure_${code}" placeholder="Enter ${label}" step="0.5" min="0">
            `;
            container.appendChild(field);
        });
    }
    
    // Export functions to global scope
    window.selectCategory = selectCategory;
    window.selectSubcategory = selectSubcategory;
    window.showGarmentSelection = showGarmentSelection;
    window.selectGarment = selectGarment;
    window.generateMeasurementFields = generateMeasurementFields;
    
    console.log('✅ Order form complete logic loaded');
})();
