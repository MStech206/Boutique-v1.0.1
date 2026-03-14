// COMPLETE ORDER FORM FIX - All Issues Resolved
(function() {
    'use strict';
    
    console.log('🔧 Loading Order Form Fix...');
    
    // Enhanced Global Order State
    window.currentOrder = {
        customer: {},
        category: '',
        subcategory: '',
        garment: null,
        measurements: {},
        design: {},
        pricing: { 
            basePrice: 0, 
            addonPrice: 0, 
            otherExpenses: 0,
            subtotal: 0,
            discount: 0,
            discountPercent: 0,
            total: 0,
            advance: 0,
            balance: 0
        },
        images: [],
        workflow: [],
        branch: ''
    };
    
    // Complete Garment Categories with Images
    const GARMENT_CATEGORIES = {
        men: {
            'business-shirt': { name: 'Business Shirt', price: 1200, measurements: ['C', 'SH', 'L'], image: '/images/Mens/Business Shirt.jfif' },
            'casual-shirt': { name: 'Casual Shirt', price: 900, measurements: ['C', 'SH', 'L'], image: '/images/Mens/Casual Shirt.jfif' },
            'men-kurta': { name: 'Men Kurta', price: 800, measurements: ['KL', 'C', 'W'], image: '/images/Mens/Men Kurta.jfif' },
            'formal-trouser': { name: 'Formal Trouser', price: 1000, measurements: ['PL', 'PW'], image: '/images/Mens/Formal Trouser.jfif' },
            'traditional-dhoti': { name: 'Traditional Dhoti', price: 600, measurements: ['W', 'L'], image: '/images/Mens/Traditional Dhoti.jfif' },
            'wedding-sherwani': { name: 'Wedding Sherwani', price: 3500, measurements: ['C', 'SH', 'L', 'W'], image: '/images/Mens/Wedding Sherwani.jfif' }
        },
        women: {
            'cross-cut-blouse': { name: 'Cross Cut Blouse', price: 850, measurements: ['BL', 'B', 'W', 'SH'], image: '/images/womens/Cross Cut Blouse.png' },
            'katora-blouse': { name: 'Katora Blouse', price: 1200, measurements: ['BL', 'B', 'W', 'SH'], image: '/images/womens/Katora Blouse.png' },
            'princess-blouse': { name: 'Princess Blouse', price: 950, measurements: ['BL', 'B', 'W', 'SH'], image: '/images/womens/princess blouse.png' },
            'padded-blouse': { name: 'Padded Blouse', price: 1200, measurements: ['BL', 'B', 'W', 'SH'], image: '/images/womens/Padded Blouse.png' },
            'umbrella-lehenga': { name: 'Umbrella Lehenga', price: 2200, measurements: ['LL', 'LW', 'B'], image: '/images/womens/Umbrella Lehanga.png' },
            'pleated-lehenga': { name: 'Pleated Lehenga', price: 2800, measurements: ['LL', 'LW', 'B'], image: '/images/womens/Pleated Lehenga.png' },
            'designer-lehenga': { name: 'Designer Lehenga', price: 3500, measurements: ['LL', 'LW', 'B'], image: '/images/womens/Designer Lehenga.png' },
            'party-frock': { name: 'Party Frock', price: 2400, measurements: ['FL', 'B', 'W'], image: '/images/womens/Party Frock.png' },
            'wedding-frock': { name: 'Wedding Frock', price: 2600, measurements: ['FL', 'B', 'W'], image: '/images/womens/Wedding Frock.png' },
            'cotton-kurthi': { name: 'Cotton Kurthi', price: 650, measurements: ['KL', 'B', 'W'], image: '/images/womens/Cotton Kurthi.png' },
            'silk-kurthi': { name: 'Silk Kurthi', price: 850, measurements: ['KL', 'B', 'W'], image: '/images/womens/Silk Kurthi.png' },
            'churidar-suit': { name: 'Churidar Suit', price: 1150, measurements: ['KL', 'B', 'W'], image: '/images/womens/Churidar Suit.png' },
            'evening-gown': { name: 'Evening Gown', price: 4000, measurements: ['B', 'W', 'FL', 'SH'], image: '/images/womens/Evening Gown.jfif' },
            'anarkali-dress': { name: 'Anarkali Dress', price: 2800, measurements: ['B', 'W', 'FL'], image: '/images/womens/Anarkali Dress.png' },
            'instant-saree': { name: 'Instant Saree', price: 2250, measurements: ['BL', 'B', 'W'], image: '/images/womens/Instant Saree.png' }
        },
        boys: {
            'school-shirt': { name: 'School Shirt', price: 700, measurements: ['C', 'L'], image: '/images/kids/boys/School Shirt.png' },
            'boys-kurta': { name: 'Boys Kurta', price: 800, measurements: ['KL', 'C'], image: '/images/kids/boys/Boys Kurta.png' },
            'school-pant': { name: 'School Pant', price: 600, measurements: ['PL', 'PW'], image: '/images/kids/boys/School Pant.jpg' },
            'festival-dhoti': { name: 'Festival Dhoti Set', price: 1200, measurements: ['C', 'W', 'L'], image: '/images/kids/boys/Festival Dhoti Set.png' }
        },
        girls: {
            'birthday-frock': { name: 'Birthday Frock (2-5 Years)', price: 1350, measurements: ['FL', 'C'], image: '/images/kids/girls/Birthday Frock (2-5 Years).jpg' },
            'school-frock': { name: 'School Frock (6-8 Years)', price: 1750, measurements: ['FL', 'C', 'W'], image: '/images/kids/girls/School Frock (6-8 Years).jpg' },
            'princess-lehenga': { name: 'Princess Lehenga (2-5 Years)', price: 1300, measurements: ['LL', 'LW'], image: '/images/kids/girls/Princess Lehenga (2-5 Years).png' },
            'festival-lehenga': { name: 'Festival Lehenga (6-8 Years)', price: 2000, measurements: ['LL', 'LW', 'C'], image: '/images/kids/girls/Festival Lehenga (6-8 Years).png' },
            'girls-kurta': { name: 'Girls Kurta', price: 750, measurements: ['KL', 'C'], image: '/images/kids/girls/Girls Kurta.jpg' },
            'dance-costume': { name: 'Dance Costume', price: 2200, measurements: ['FL', 'C', 'W'], image: '/images/kids/girls/Dance Costume.jpg' }
        },
        fitting: {
            'blouse-alteration': { name: 'Blouse Alteration', price: 200, measurements: ['BL', 'B'], image: '/images/repair and fitting/Blouse Alteration.jpg' },
            'dress-alteration': { name: 'Dress Alteration', price: 300, measurements: ['FL', 'B'], image: '/images/repair and fitting/Dress Alteration.jpg' },
            'pant-alteration': { name: 'Pant Alteration', price: 150, measurements: ['PL'], image: '/images/repair and fitting/Pant Alternation.jpg' },
            'saree-service': { name: 'Saree Fall & Pico', price: 250, measurements: [], image: '/images/repair and fitting/Saree Fall & Pico.jpg' }
        },
        'ready-made': {
            'readymade-shirt': { name: 'Readymade Shirt', price: 500, measurements: ['SIZE'], isReadyMade: true, image: '/sapthala-admin-imgs/Readymade imgs/Readymade Shirt.jfif' },
            'readymade-dress': { name: 'Readymade Dress', price: 800, measurements: ['SIZE'], isReadyMade: true, image: '/sapthala-admin-imgs/Readymade imgs/Readymade Dress.png' },
            'readymade-kurta': { name: 'Readymade Kurta Set', price: 1200, measurements: ['SIZE'], isReadyMade: true, image: '/sapthala-admin-imgs/Readymade imgs/Readymade Kurta Set.png' },
            'readymade-blouse': { name: 'Readymade Blouse', price: 600, measurements: ['SIZE'], isReadyMade: true, image: '/sapthala-admin-imgs/Readymade imgs/Readymade Blouse.png' }
        },
        redo: {
            'size-adjustment': { name: 'Size Adjustment', price: 0, measurements: ['Current Size', 'New Size'], image: '/images/repair and fitting/Size Adjustment.jpg', isRedo: true },
            'design-modification': { name: 'Design Modification', price: 0, measurements: ['Modification Details'], image: '/images/repair and fitting/Design Modification.jpg', isRedo: true },
            'length-correction': { name: 'Length Correction', price: 0, measurements: ['Current Length', 'Required Length'], image: '/images/repair and fitting/Length Correction.jpg', isRedo: true },
            'fitting-issue': { name: 'Fitting Issue Fix', price: 0, measurements: ['Problem Area', 'Solution'], image: '/images/repair and fitting/Fitting Issue Fix.jpg', isRedo: true },
            'color-change': { name: 'Color Change Request', price: 0, measurements: ['Current Color', 'New Color'], image: '/images/repair and fitting/Color Change Request.jpg', isRedo: true },
            'complete-redo': { name: 'Complete Redo', price: 0, measurements: ['Issue Description', 'New Requirements'], image: '/images/repair and fitting/Complete Redo.jpg', isRedo: true }
        }
    };
    
    const MEASUREMENT_LABELS = {
        'BL': 'Blouse Length', 'B': 'Bust', 'W': 'Waist', 'SH': 'Shoulder',
        'LL': 'Lehenga Length', 'LW': 'Lehenga Waist', 'FL': 'Frock Length',
        'KL': 'Kurta Length', 'PL': 'Pant Length', 'PW': 'Pant Waist', 'C': 'Chest', 'L': 'Length',
        'SIZE': 'Size (S/M/L/XL)'
    };
    
    const ADDON_SERVICES = {
        'fall-pico': { name: 'Fall & Pico', price: 150 },
        'saree-knots': { name: 'Saree Knots', price: 500 },
        'can-can-extra': { name: 'Can-Can (Extra Layer)', price: 500 },
        'other': { name: '', price: 0 }
    };
    
    // Initialize on DOM load
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📋 Initializing Order Form...');
        initializeOrderForm();
    });
    
    function initializeOrderForm() {
        // Category button handlers
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                selectCategory(this.dataset.category);
            });
        });
        
        // Subcategory button handlers
        document.querySelectorAll('.subcategory-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                selectSubcategory(this.dataset.subcategory);
            });
        });
        
        // Customer input handlers
        const customerPhone = document.getElementById('customerPhone');
        const customerName = document.getElementById('customerName');
        
        if (customerPhone) {
            customerPhone.addEventListener('input', function() {
                const name = customerName ? customerName.value : '';
                if (this.value.length >= 10 && name.length >= 2) {
                    setTimeout(() => {
                        const categorySection = document.getElementById('categorySection');
                        if (categorySection) {
                            categorySection.style.display = 'block';
                            categorySection.scrollIntoView({ behavior: 'smooth' });
                        }
                    }, 300);
                }
            });
        }
        
        if (customerName) {
            customerName.addEventListener('input', function() {
                const phone = customerPhone ? customerPhone.value : '';
                if (this.value.length >= 2 && phone.length >= 10) {
                    setTimeout(() => {
                        const categorySection = document.getElementById('categorySection');
                        if (categorySection) {
                            categorySection.style.display = 'block';
                            categorySection.scrollIntoView({ behavior: 'smooth' });
                        }
                    }, 300);
                }
            });
        }
        
        // Discount handlers
        const discountEnabled = document.getElementById('discountEnabled');
        if (discountEnabled) {
            discountEnabled.addEventListener('change', toggleDiscount);
        }
        
        const discountPercent = document.getElementById('discountPercent');
        if (discountPercent) {
            discountPercent.addEventListener('input', () => calculateDiscount('percent'));
        }
        
        const discountAmount = document.getElementById('discountAmount');
        if (discountAmount) {
            discountAmount.addEventListener('input', () => calculateDiscount('amount'));
        }
        
        // Other expenses handler
        const otherExpenses = document.getElementById('otherExpenses');
        if (otherExpenses) {
            otherExpenses.addEventListener('input', calculateTotal);
        }
        
        // Advance payment handler
        const advancePayment = document.getElementById('advancePayment');
        if (advancePayment) {
            advancePayment.addEventListener('input', calculateTotal);
        }
        
        // Addon checkboxes
        document.querySelectorAll('[data-addon]').forEach(checkbox => {
            checkbox.addEventListener('change', calculateTotal);
        });
        
        console.log('✅ Order form initialized successfully');
    }
    
    function selectCategory(category) {
        console.log('📂 Category selected:', category);
        window.currentOrder.category = category;
        
        // Update UI
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        const selectedBtn = document.querySelector(`[data-category=\"${category}\"]`);
        if (selectedBtn) selectedBtn.classList.add('active');
        
        const kidsSubcategory = document.getElementById('kidsSubcategory');
        const garmentSelection = document.getElementById('garmentSelection');
        
        if (category === 'kids') {
            if (kidsSubcategory) {
                kidsSubcategory.classList.remove('hidden');
                setTimeout(() => kidsSubcategory.scrollIntoView({ behavior: 'smooth' }), 200);
            }
            if (garmentSelection) garmentSelection.classList.add('hidden');
        } else {
            if (kidsSubcategory) kidsSubcategory.classList.add('hidden');
            showGarmentSelection(category);
        }
    }
    
    function selectSubcategory(subcategory) {
        console.log('📂 Subcategory selected:', subcategory);
        window.currentOrder.subcategory = subcategory;
        
        document.querySelectorAll('.subcategory-btn').forEach(btn => btn.classList.remove('active'));
        const selectedBtn = document.querySelector(`[data-subcategory=\"${subcategory}\"]`);
        if (selectedBtn) selectedBtn.classList.add('active');
        
        showGarmentSelection(subcategory);
    }
    
    function showGarmentSelection(category) {
        const garments = GARMENT_CATEGORIES[category];
        if (!garments) {
            console.warn('⚠️ No garments found for category:', category);
            return;
        }
        
        const container = document.getElementById('garmentButtons');
        if (!container) {
            console.warn('⚠️ Garment buttons container not found');
            return;
        }
        
        container.innerHTML = '';
        
        Object.keys(garments).forEach(key => {
            const garment = garments[key];
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'garment-btn';
            btn.dataset.garment = key;
            
            // Add image if available
            let imageHtml = '';
            if (garment.image) {
                imageHtml = `<img src=\"${garment.image}\" alt=\"${garment.name}\" style=\"width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;\" onerror=\"this.style.display='none'\">`;
            }
            
            btn.innerHTML = `
                ${imageHtml}
                <div style=\"font-weight: bold; font-size: 16px; margin-bottom: 8px;\">${garment.name}</div>
                <div style=\"color: #10b981; font-weight: bold; font-size: 18px;\">₹${garment.price}</div>
            `;
            btn.onclick = () => selectGarment(key, garment);
            container.appendChild(btn);
        });
        
        const garmentSelection = document.getElementById('garmentSelection');
        if (garmentSelection) {
            garmentSelection.classList.remove('hidden');
            setTimeout(() => garmentSelection.scrollIntoView({ behavior: 'smooth' }), 300);
        }
        
        console.log('✅ Garment selection displayed:', Object.keys(garments).length, 'items');
    }
    
    function selectGarment(key, garment) {
        console.log('👗 Garment selected:', garment.name);
        
        window.currentOrder.garment = { key, ...garment };
        
        // Update UI
        document.querySelectorAll('.garment-btn').forEach(btn => btn.classList.remove('active'));
        const selectedBtn = document.querySelector(`[data-garment=\"${key}\"]`);
        if (selectedBtn) selectedBtn.classList.add('active');
        
        // Show measurement section
        const measurementSection = document.getElementById('measurementSection');
        if (measurementSection) {
            measurementSection.style.display = 'block';
            generateMeasurementFields(garment.measurements || []);
            setTimeout(() => measurementSection.scrollIntoView({ behavior: 'smooth' }), 300);
        }
        
        // Show pricing section
        const pricingSection = document.getElementById('pricingSection');
        if (pricingSection) {
            pricingSection.style.display = 'block';
        }
        
        // Update pricing
        window.currentOrder.pricing.basePrice = garment.price || 0;
        calculateTotal();
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
                <input type=\"number\" id=\"measure_${code}\" placeholder=\"Enter ${label}\" step=\"0.5\" min=\"0\">
            `;
            container.appendChild(field);
        });
        
        console.log('✅ Measurement fields generated:', measurements.length);
    }
    
    function toggleDiscount() {
        const enabled = document.getElementById('discountEnabled').checked;
        const controls = document.getElementById('discountControls');
        const display = document.getElementById('discountDisplay');
        
        if (enabled) {
            if (controls) controls.classList.remove('hidden');
            if (display) display.classList.remove('hidden');
        } else {
            if (controls) controls.classList.add('hidden');
            if (display) display.classList.add('hidden');
            
            // Reset discount
            window.currentOrder.pricing.discount = 0;
            window.currentOrder.pricing.discountPercent = 0;
            
            const discountPercent = document.getElementById('discountPercent');
            const discountAmount = document.getElementById('discountAmount');
            if (discountPercent) discountPercent.value = '';
            if (discountAmount) discountAmount.value = '';
            
            calculateTotal();
        }
    }
    
    function calculateDiscount(type) {
        const subtotal = window.currentOrder.pricing.subtotal || 0;
        
        if (type === 'percent') {
            const percent = parseFloat(document.getElementById('discountPercent').value) || 0;
            
            // Limit discount to 15%
            if (percent > 15) {
                alert('⚠️ Maximum discount allowed is 15%');
                document.getElementById('discountPercent').value = 15;
                window.currentOrder.pricing.discountPercent = 15;
            } else {
                window.currentOrder.pricing.discountPercent = percent;
            }
            
            window.currentOrder.pricing.discount = Math.round((subtotal * window.currentOrder.pricing.discountPercent) / 100);
            
            // Update amount field
            const discountAmount = document.getElementById('discountAmount');
            if (discountAmount) {
                discountAmount.value = window.currentOrder.pricing.discount;
            }
        } else {
            const amount = parseFloat(document.getElementById('discountAmount').value) || 0;
            window.currentOrder.pricing.discount = amount;
            
            // Calculate percent
            window.currentOrder.pricing.discountPercent = subtotal > 0 ? Math.round((amount / subtotal) * 100) : 0;
            
            // Update percent field
            const discountPercent = document.getElementById('discountPercent');
            if (discountPercent) {
                discountPercent.value = window.currentOrder.pricing.discountPercent;
            }
        }
        
        // Update display
        const discountValue = document.getElementById('discountValue');
        if (discountValue) {
            discountValue.textContent = `₹${window.currentOrder.pricing.discount}`;
        }
        
        calculateTotal();
    }
    
    function calculateTotal() {
        const pricing = window.currentOrder.pricing;
        
        // Base price
        pricing.basePrice = pricing.basePrice || 0;
        
        // Calculate addon price
        pricing.addonPrice = 0;
        document.querySelectorAll('[data-addon]:checked').forEach(checkbox => {
            const addonKey = checkbox.dataset.addon;
            if (addonKey === 'other') {
                const otherPrice = parseFloat(document.getElementById('addonOtherPrice').value) || 0;
                pricing.addonPrice += otherPrice;
            } else if (ADDON_SERVICES[addonKey]) {
                pricing.addonPrice += ADDON_SERVICES[addonKey].price;
            }
        });
        
        // Other expenses
        pricing.otherExpenses = parseFloat(document.getElementById('otherExpenses')?.value) || 0;
        
        // Subtotal
        pricing.subtotal = pricing.basePrice + pricing.addonPrice + pricing.otherExpenses;
        
        // Apply discount
        pricing.total = pricing.subtotal - (pricing.discount || 0);
        
        // Advance and balance
        pricing.advance = parseFloat(document.getElementById('advancePayment')?.value) || 0;
        pricing.balance = pricing.total - pricing.advance;
        
        // Update UI
        document.getElementById('basePrice').textContent = `₹${pricing.basePrice}`;
        document.getElementById('addonPrice').textContent = `₹${pricing.addonPrice}`;
        document.getElementById('subtotal').textContent = `₹${pricing.subtotal}`;
        document.getElementById('totalAmount').textContent = `₹${pricing.total}`;
        document.getElementById('balanceDue').textContent = `₹${pricing.balance}`;
        
        console.log('💰 Pricing calculated:', pricing);
    }
    
    function toggleOtherAddon() {
        const checkbox = document.getElementById('addonOtherCheck');
        const nameInput = document.getElementById('addonOtherName');
        const priceInput = document.getElementById('addonOtherPrice');
        
        if (checkbox && checkbox.checked) {
            if (nameInput) nameInput.disabled = false;
            if (priceInput) priceInput.disabled = false;
        } else {
            if (nameInput) {
                nameInput.disabled = true;
                nameInput.value = '';
            }
            if (priceInput) {
                priceInput.disabled = true;
                priceInput.value = '';
            }
        }
        
        calculateTotal();
    }
    
    function updateOtherAddon() {
        calculateTotal();
    }
    
    // Export functions to global scope
    window.selectCategory = selectCategory;
    window.selectSubcategory = selectSubcategory;
    window.showGarmentSelection = showGarmentSelection;
    window.selectGarment = selectGarment;
    window.generateMeasurementFields = generateMeasurementFields;
    window.toggleDiscount = toggleDiscount;
    window.calculateDiscount = calculateDiscount;
    window.calculateTotal = calculateTotal;
    window.toggleOtherAddon = toggleOtherAddon;
    window.updateOtherAddon = updateOtherAddon;

    // Canonical (library) references so older inline handlers can delegate safely
    window._canonicalCalculateTotal = calculateTotal;
    window._canonicalToggleOtherAddon = toggleOtherAddon;
    window._canonicalUpdateOtherAddon = updateOtherAddon;
    window._canonicalToggleDiscount = toggleDiscount;
    window._canonicalCalculateDiscount = calculateDiscount;
    
    console.log('✅ Order form fix loaded successfully');
})();
