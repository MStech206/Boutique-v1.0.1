const axios = require('axios');

class NotificationService {
    /**
     * Send WhatsApp message with PDF link via free wa.me (no Twilio cost)
     * @param {string} phone - Customer phone number
     * @param {string} message - WhatsApp message text
     * @param {string} pdfUrl - Optional PDF URL to include in message
     * @returns {Promise} - { success: true, sentVia: 'wa.me', whatsappUrl, pdfUrl }
     */
    static async sendWhatsAppToCustomer(phone, message, pdfUrl = null) {
        try {
            // Format phone number: ensure it's E.164 format (+ followed by digits)
            let formattedPhone = phone.toString().trim();
            if (!formattedPhone.startsWith('+')) {
                formattedPhone = '+' + formattedPhone;
            }
            // Remove spaces/dashes for WhatsApp URL
            const urlPhone = formattedPhone.replace(/[^\d+]/g, '');

            // Build WhatsApp message with PDF link if available
            let whatsappMessage = message;
            if (pdfUrl) {
                whatsappMessage += `\n\n📄 *DOWNLOAD YOUR INVOICE:*\n🔗 ${pdfUrl}\n\n💡 *Instructions:*\n• Click the link above to view/download PDF\n• Save to your device for records\n• Print if needed`;
            }

            // Create wa.me URL (free, no cost)
            const whatsappUrl = `https://wa.me/${urlPhone.replace('+', '')}?text=${encodeURIComponent(whatsappMessage)}`;

            console.log(`📱 WhatsApp share link generated for ${formattedPhone}: ${whatsappUrl.substring(0, 60)}...`);

            // Return free wa.me link (user can click to open WhatsApp and send manually)
            return {
                success: true,
                sentVia: 'wa.me',
                whatsappUrl,
                pdfUrl,
                message: 'Click the link or use your phone to send via WhatsApp'
            };
        } catch (error) {
            console.error('❌ WhatsApp link generation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async notifyStaff(staffList, orderData) {
        try {
            const notifications = [];
            
            for (const staff of staffList) {
                const message = `🔔 NEW ORDER ALERT\n\n` +
                    `Order ID: ${orderData.orderId}\n` +
                    `Customer: ${orderData.customerName}\n` +
                    `Phone: ${orderData.customerPhone}\n` +
                    `Garment: ${orderData.garmentType}\n` +
                    `Amount: ₹${orderData.totalAmount}\n` +
                    `Delivery: ${new Date(orderData.deliveryDate).toLocaleDateString()}\n\n` +
                    `Please prepare for production.\n\n` +
                    `- SAPTHALA Team`;

                const phone = staff.phone.toString().trim();
                const urlPhone = (phone.startsWith('+') ? phone : '+' + phone).replace('+', '');
                const whatsappUrl = `https://wa.me/${urlPhone}?text=${encodeURIComponent(message)}`;
                
                notifications.push({
                    staffName: staff.name,
                    phone: phone,
                    whatsappUrl,
                    message
                });
            }
            
            return {
                success: true,
                notifications,
                count: notifications.length
            };
        } catch (error) {
            console.error('❌ Staff notification error:', error);
            return { success: false, error: error.message };
        }
    }

    static generateCustomerMessage(order, festivalTheme = 'default') {
        const themes = {
            diwali: '🪔 Diwali Greetings! 🪔',
            holi: '🌈 Holi Celebrations! 🌈',
            navratri: '💃 Navratri Blessings! 💃',
            ganesh: '🙏 Ganesh Chaturthi! 🙏',
            ramadan: '🌙 Ramadan Kareem! 🌙',
            eid: '🎉 Eid Mubarak! 🎉',
            default: '✨ Greetings from SAPTHALA! ✨'
        };

        const greeting = themes[festivalTheme] || themes.default;
        
        return `${greeting}\n\n` +
            `Dear ${order.customerName},\n\n` +
            `Thank you for choosing SAPTHALA Designer Workshop! 🎨\n\n` +
            `📋 ORDER CONFIRMATION\n` +
            `Order ID: ${order.orderId}\n` +
            `Garment: ${order.garmentType}\n` +
            `Total Amount: ₹${order.totalAmount}\n` +
            `Advance Paid: ₹${order.advanceAmount}\n` +
            `Balance: ₹${order.totalAmount - order.advanceAmount}\n` +
            `Delivery Date: ${new Date(order.deliveryDate).toLocaleDateString()}\n\n` +
            `Your order is confirmed and will be ready on time! 👗\n\n` +
            `For any queries, call: 7794021608\n\n` +
            `Best Regards,\n` +
            `SAPTHALA Designer Workshop`;
    }
}

module.exports = NotificationService;