// PDF Preview and WhatsApp Sharing Functions

async function previewPDF() {
    try {
        // Validate order data
        if (!window.currentOrder || !window.currentOrder.garment) {
            alert('❌ Please complete the order form first');
            return;
        }

        const customerName = document.getElementById('customerName')?.value?.trim();
        const customerPhone = document.getElementById('customerPhone')?.value?.trim();
        
        if (!customerName || !customerPhone) {
            alert('❌ Please enter customer name and phone number');
            return;
        }

        // Build order data
        const orderData = {
            orderId: `ORD-PREVIEW-${Date.now()}`,
            customerName: customerName,
            customerPhone: customerPhone,
            customerAddress: document.getElementById('customerAddress')?.value?.trim() || '',
            garmentType: window.currentOrder.garment.name,
            measurements: window.currentOrder.measurements || {},
            totalAmount: window.currentOrder.pricing.total || 0,
            advanceAmount: parseFloat(document.getElementById('advancePayment')?.value) || 0,
            balanceAmount: window.currentOrder.pricing.balance || 0,
            deliveryDate: document.getElementById('deliveryDate')?.value || '',
            branch: document.getElementById('orderBranch')?.value || 'SAPTHALA.MAIN',
            designNotes: document.getElementById('designDescription')?.value || '',
            theme: document.getElementById('themeSelector')?.value || 'default'
        };

        console.log('📄 Generating PDF preview...', orderData);

        // Generate PDF via API
        const response = await fetch('/api/share-order-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('sapthala_token')}`
            },
            body: JSON.stringify({
                orderData: orderData,
                sendNow: false
            })
        });

        const result = await response.json();

        if (result.success && result.pdf) {
            const pdfPath = result.pdf.pdfPath || result.pdf.htmlPath;
            if (pdfPath) {
                // Open PDF in new tab
                const fullUrl = pdfPath.startsWith('/') ? window.location.origin + pdfPath : pdfPath;
                window.open(fullUrl, '_blank');
                console.log('✅ PDF preview opened:', fullUrl);
            } else {
                alert('⚠️ PDF generated but path is missing');
            }
        } else {
            throw new Error(result.error || 'PDF generation failed');
        }

    } catch (error) {
        console.error('❌ PDF preview error:', error);
        alert(`❌ Failed to generate PDF preview: ${error.message}`);
    }
}

async function shareViaWhatsApp() {
    try {
        // Validate order data
        if (!window.currentOrder || !window.currentOrder.garment) {
            alert('❌ Please complete the order form first');
            return;
        }

        const customerName = document.getElementById('customerName')?.value?.trim();
        const customerPhone = document.getElementById('customerPhone')?.value?.trim();
        
        if (!customerName || !customerPhone) {
            alert('❌ Please enter customer name and phone number');
            return;
        }

        if (customerPhone.length < 10) {
            alert('❌ Please enter a valid 10-digit phone number');
            return;
        }

        // Build order data
        const orderData = {
            orderId: `ORD-${Date.now()}`,
            customerName: customerName,
            customerPhone: customerPhone,
            customerAddress: document.getElementById('customerAddress')?.value?.trim() || '',
            garmentType: window.currentOrder.garment.name,
            measurements: window.currentOrder.measurements || {},
            totalAmount: window.currentOrder.pricing.total || 0,
            advanceAmount: parseFloat(document.getElementById('advancePayment')?.value) || 0,
            balanceAmount: window.currentOrder.pricing.balance || 0,
            deliveryDate: document.getElementById('deliveryDate')?.value || '',
            branch: document.getElementById('orderBranch')?.value || 'SAPTHALA.MAIN',
            designNotes: document.getElementById('designDescription')?.value || '',
            theme: document.getElementById('themeSelector')?.value || 'default'
        };

        console.log('📱 Sharing via WhatsApp...', orderData);

        // Generate PDF first
        const pdfResponse = await fetch('/api/share-order-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('sapthala_token')}`
            },
            body: JSON.stringify({
                orderData: orderData,
                sendNow: false
            })
        });

        const pdfResult = await pdfResponse.json();
        let pdfUrl = null;

        if (pdfResult.success && pdfResult.pdf) {
            pdfUrl = pdfResult.pdf.pdfPath || pdfResult.pdf.htmlPath;
            if (pdfUrl && pdfUrl.startsWith('/')) {
                pdfUrl = window.location.origin + pdfUrl;
            }
        }

        // Generate WhatsApp message
        const message = `🎊 *SAPTHALA BOUTIQUE* 🎊

Dear ${customerName},

Your order details:

📋 *Order Information:*
• Order ID: ${orderData.orderId}
• Garment: ${orderData.garmentType}
• Branch: ${orderData.branch}
• Delivery Date: ${new Date(orderData.deliveryDate).toLocaleDateString('en-IN')}

💰 *Payment Details:*
• Total Amount: ₹${orderData.totalAmount.toLocaleString()}
• Advance Paid: ₹${orderData.advanceAmount.toLocaleString()}
• Balance Due: ₹${orderData.balanceAmount.toLocaleString()}

✨ Your order is being processed by our expert team!

Thank you for choosing Sapthala Boutique! 🙏

${pdfUrl ? `\n📄 View your invoice: ${pdfUrl}` : ''}`;

        // Format phone number
        const phone = customerPhone.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;

        // Open WhatsApp
        window.open(whatsappUrl, '_blank');
        console.log('✅ WhatsApp opened successfully');

        alert('✅ WhatsApp opened! Click "Send" to share the order details with the customer.');

    } catch (error) {
        console.error('❌ WhatsApp sharing error:', error);
        alert(`❌ Failed to share via WhatsApp: ${error.message}`);
    }
}

// Export functions
window.previewPDF = previewPDF;
window.shareViaWhatsApp = shareViaWhatsApp;

console.log('✅ PDF preview and WhatsApp sharing functions loaded');
