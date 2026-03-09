// ENHANCED ORDER CREATION WITH FIREBASE & STAFF NOTIFICATIONS
async function createOrder(event) {
    try {
        if (event) event.preventDefault();
        
        console.log('🚀 Starting order creation...');
        
        // Prevent duplicate submissions
        if (window.isCreatingOrder) {
            console.warn('⚠️ Order creation already in progress');
            alert('⏳ Order creation in progress, please wait...');
            return;
        }
        window.isCreatingOrder = true;
        
        // Show loading indicator
        const createBtn = document.querySelector('.btn-primary');
        const originalBtnText = createBtn ? createBtn.innerHTML : '';
        if (createBtn) {
            createBtn.disabled = true;
            createBtn.innerHTML = '⏳ Creating Order...';
        }
        
        // Validate customer info
        const customerName = document.getElementById('customerName')?.value?.trim();
        const customerPhone = document.getElementById('customerPhone')?.value?.trim();
        const customerAddress = document.getElementById('customerAddress')?.value?.trim();
        const branch = document.getElementById('orderBranch')?.value;
        
        if (!customerName || !customerPhone) {
            alert('❌ Please enter customer name and phone number');
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.innerHTML = originalBtnText;
            }
            window.isCreatingOrder = false;
            return;
        }
        
        if (customerPhone.length < 10) {
            alert('❌ Please enter a valid 10-digit phone number');
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.innerHTML = originalBtnText;
            }
            window.isCreatingOrder = false;
            return;
        }
        
        if (!branch) {
            alert('❌ Please select a branch');
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.innerHTML = originalBtnText;
            }
            window.isCreatingOrder = false;
            return;
        }
        
        // Validate garment selection
        if (!window.currentOrder || !window.currentOrder.garment) {
            alert('❌ Please select a garment');
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.innerHTML = originalBtnText;
            }
            window.isCreatingOrder = false;
            return;
        }
        
        // Collect measurements
        const measurements = {};
        const measurementFields = document.querySelectorAll('[id^=\"measure_\"]');
        measurementFields.forEach(field => {
            const code = field.id.replace('measure_', '');
            const value = field.value?.trim();
            if (value) {
                measurements[code] = value;
            }
        });
        
        // Validate design description
        const designDescription = document.getElementById('designDescription')?.value?.trim();
        if (!designDescription) {
            alert('❌ Please enter design description');
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.innerHTML = originalBtnText;
            }
            window.isCreatingOrder = false;
            return;
        }
        
        // Validate delivery date
        const deliveryDate = document.getElementById('deliveryDate')?.value;
        if (!deliveryDate) {
            alert('❌ Please select delivery date');
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.innerHTML = originalBtnText;
            }
            window.isCreatingOrder = false;
            return;
        }
        
        // Validate advance payment
        const advancePayment = parseFloat(document.getElementById('advancePayment')?.value) || 0;
        if (advancePayment <= 0) {
            alert('❌ Please enter advance payment amount');
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.innerHTML = originalBtnText;
            }
            window.isCreatingOrder = false;
            return;
        }
        
        // Validate advance is not more than total
        if (advancePayment > window.currentOrder.pricing.total) {
            alert('❌ Advance payment cannot be more than total amount');
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.innerHTML = originalBtnText;
            }
            window.isCreatingOrder = false;
            return;
        }
        
        // Collect workflow stages
        const workflow = [];
        document.querySelectorAll('[data-stage]:checked').forEach(checkbox => {
            workflow.push(checkbox.dataset.stage);
        });
        
        if (workflow.length === 0) {
            alert('❌ Please select at least one workflow stage');
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.innerHTML = originalBtnText;
            }
            window.isCreatingOrder = false;
            return;
        }
        
        // Collect design images
        const designImages = [];
        const imagePreview = document.getElementById('imagePreview');
        if (imagePreview) {
            imagePreview.querySelectorAll('img').forEach(img => {
                designImages.push(img.src);
            });
        }
        
        // Build order data
        const orderData = {
            customer: {
                name: customerName,
                phone: customerPhone,
                address: customerAddress
            },
            garmentType: window.currentOrder.garment.name,
            measurements: measurements,
            designNotes: designDescription,
            designImages: designImages,
            pricing: {
                total: window.currentOrder.pricing.total,
                advance: advancePayment,
                balance: window.currentOrder.pricing.balance
            },
            deliveryDate: deliveryDate,
            branch: branch,
            workflow: workflow,
            theme: document.getElementById('themeSelector')?.value || 'default'
        };
        
        console.log('📦 Order data prepared:', orderData);
        console.log('📸 Design images:', designImages.length);
        console.log('📏 Measurements:', measurements);
        console.log('🔄 Workflow stages:', workflow);
        
        // Send to server
        const token = localStorage.getItem('sapthala_token') || sessionStorage.getItem('sapthala_token');
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            console.log('✅ Order created successfully:', result.order.orderId);
            
            // Show detailed success message
            const successMsg = `✅ Order Created Successfully!

Order ID: ${result.order.orderId}
Customer: ${customerName}
Phone: ${customerPhone}
Branch: ${branch}
Garment: ${window.currentOrder.garment.name}

Pricing:
• Total: ₹${window.currentOrder.pricing.total}
• Advance: ₹${advancePayment}
• Balance: ₹${window.currentOrder.pricing.balance}

Workflow: ${workflow.length} stages assigned
Delivery: ${deliveryDate}

✅ Order has been sent to staff for processing!

📱 Opening WhatsApp to notify customer...`;
            
            alert(successMsg);
            
            // Generate WhatsApp message
            const whatsappMsg = `🎊 *SAPTHALA BOUTIQUE* 🎊

Dear ${customerName},

Your order has been confirmed! ✅

📋 *Order Details:*
• Order ID: ${result.order.orderId}
• Garment: ${window.currentOrder.garment.name}
• Branch: ${branch}
• Delivery Date: ${new Date(deliveryDate).toLocaleDateString('en-IN')}

💰 *Payment:*
• Total: ₹${window.currentOrder.pricing.total}
• Advance Paid: ₹${advancePayment}
• Balance: ₹${window.currentOrder.pricing.balance}

✨ Your order is now being processed by our expert team!

Thank you for choosing Sapthala Boutique! 🙏`;
            
            // Open WhatsApp in new tab
            const phoneNumber = customerPhone.replace(/[^0-9]/g, '');
            const whatsappUrl = `https://wa.me/91${phoneNumber}?text=${encodeURIComponent(whatsappMsg)}`;
            window.open(whatsappUrl, '_blank');
            
            // Reset form
            resetOrderForm();
            
            // Refresh dashboard
            if (typeof updateDashboardStats === 'function') {
                updateDashboardStats();
            }
            
            // Switch to orders tab
            if (typeof showTab === 'function') {
                showTab('orders');
            }
        } else {
            throw new Error(result.error || 'Failed to create order');
        }
        
        if (createBtn) {
            createBtn.disabled = false;
            createBtn.innerHTML = originalBtnText;
        }
        
    } catch (error) {
        console.error('❌ Order creation error:', error);
        alert(`❌ Failed to create order: ${error.message}\n\nPlease check all fields and try again.`);
        
        const createBtn = document.querySelector('.btn-primary');
        if (createBtn) {
            createBtn.disabled = false;
            createBtn.innerHTML = 'Create Order & Send to Staff';
        }
    } finally {
        // Reset flag after a short delay
        setTimeout(() => {
            window.isCreatingOrder = false;
        }, 1000);
    }
}

function resetOrderForm() {
    console.log('🔄 Resetting order form...');
    
    // Reset global state
    window.currentOrder = {
        customer: {},
        category: '',
        subcategory: '',
        garment: null,
        measurements: {},
        design: {},
        pricing: { basePrice: 0, addonPrice: 0, discount: 0, total: 0, advance: 0, balance: 0 },
        images: [],
        workflow: [],
        branch: ''
    };
    
    // Reset form fields
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerAddress').value = '';
    document.getElementById('designDescription').value = '';
    document.getElementById('designNotes').value = '';
    document.getElementById('deliveryDate').value = '';
    document.getElementById('advancePayment').value = '';
    document.getElementById('otherExpenses').value = '';
    
    // Reset discount
    document.getElementById('discountEnabled').checked = false;
    document.getElementById('discountPercent').value = '';
    document.getElementById('discountAmount').value = '';
    toggleDiscount();
    
    // Reset addons
    document.querySelectorAll('[data-addon]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Reset workflow stages to default
    document.querySelectorAll('[data-stage]').forEach(checkbox => {
        const stage = checkbox.dataset.stage;
        checkbox.checked = ['dyeing', 'cutting', 'stitching', 'finishing', 'quality-check', 'ready-to-deliver'].includes(stage);
    });
    
    // Reset category selection
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.subcategory-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.garment-btn').forEach(btn => btn.classList.remove('active'));
    
    // Hide sections
    document.getElementById('categorySection').style.display = 'none';
    document.getElementById('measurementSection').style.display = 'none';
    document.getElementById('pricingSection').style.display = 'none';
    document.getElementById('garmentSelection').classList.add('hidden');
    document.getElementById('kidsSubcategory').classList.add('hidden');
    
    // Clear image preview
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) {
        imagePreview.innerHTML = '';
    }
    
    // Reset pricing display
    calculateTotal();
    
    console.log('✅ Order form reset complete');
}

function handleImageUpload(event) {
    const files = event.target.files;
    const imagePreview = document.getElementById('imagePreview');
    
    if (!imagePreview) return;
    
    // Validate file count
    if (files.length > 5) {
        alert('⚠️ Maximum 5 images allowed');
        event.target.value = '';
        return;
    }
    
    // Clear previous preview
    imagePreview.innerHTML = '';
    
    Array.from(files).forEach((file, index) => {
        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            alert(`⚠️ Image ${index + 1} exceeds 5MB limit`);
            return;
        }
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert(`⚠️ File ${index + 1} is not an image`);
            return;
        }
        
        // Create preview
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = file.name;
            img.style.cssText = 'width:100%;height:100px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;';
            imagePreview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
    
    console.log('📷 Images uploaded:', files.length);
}

// Export functions
window.createOrder = createOrder;
window.resetOrderForm = resetOrderForm;
window.handleImageUpload = handleImageUpload;

console.log('✅ Enhanced order creation loaded');
