const fs = require('fs');
const path = require('path');

class EnhancedPDFService {
  static getThemeWatermark(themeName) {
    const watermarkMap = {
      'default': 'sapthala logo.PNG',
      'newYear': 'new year.png',
      'sankranti': 'sankranthi.png',
      'holi': 'holi image-Photoroom.png',
      'ugadi': 'sapthala logo.PNG', // No specific ugadi image, use default
      'ramadan': 'Ramzan.png',
      'diwali': 'Diwali.png',
      'ganesh': 'ganesh maharaj-Photoroom.png',
      'independence': 'Independence day.png',
      'christmas': 'Chirstmas.PNG'
    };
    
    return watermarkMap[themeName] || 'sapthala logo.PNG';
  }
  
  static getThemeTemplate(themeName) {
    const templateMap = {
      'default': 'default-invoice-template.html',
      'newYear': 'newyear-invoice-template.html',
      'sankranti': 'sankranthi-invoice-template.html',
      'holi': 'holi-invoice-template.html',
      'ugadi': 'default-invoice-template.html', // No specific ugadi template
      'ramadan': 'ramzan-invoice-template.html',
      'diwali': 'diwali-invoice-template.html',
      'ganesh': 'ganesh-chaturthi-invoice-template.html',
      'independence': 'independence-day-invoice-template.html',
      'christmas': 'christmas-invoice-template.html'
    };
    
    return templateMap[themeName] || 'default-invoice-template.html';
  }

  static async generateThemedPDF(orderData, settings, themeName = 'default') {
    try {
      console.log(`🎨 Generating PDF with ${themeName} theme`);
      
      // Support invoice theme located at project root `invoice theme` or inside services folder
      let invoiceThemePath = path.join(process.cwd(), 'invoice theme');
      if (!fs.existsSync(invoiceThemePath)) {
        invoiceThemePath = path.join(__dirname, 'invoice theme');
      }
      const templateFile = this.getThemeTemplate(themeName);
      const watermarkFile = this.getThemeWatermark(themeName);
      
      let templatePath = path.join(invoiceThemePath, templateFile);
      const watermarkPath = path.join(invoiceThemePath, watermarkFile);
      
      // Check if template exists
      if (!fs.existsSync(templatePath)) {
        console.warn(`⚠️ Template not found: ${templatePath}, trying alternate locations`);
        const defaultPathRoot = path.join(process.cwd(), 'invoice theme', 'default-invoice-template.html');
        const defaultPathServices = path.join(__dirname, 'invoice theme', 'default-invoice-template.html');
        if (fs.existsSync(defaultPathRoot)) {
          templatePath = defaultPathRoot;
        } else if (fs.existsSync(defaultPathServices)) {
          templatePath = defaultPathServices;
        } else {
          throw new Error('Default template not found');
        }
      }
      
      // Read template
      let htmlContent = fs.readFileSync(templatePath, 'utf8');
      
      // Replace placeholders with actual data
      const replacements = {
        '[Customer Name]': orderData.customerName || 'N/A',
        '[Phone Number]': orderData.customerPhone || 'N/A',
        '[Invoice Number]': orderData.orderId || `INV-${Date.now()}`,
        '[Invoice Date]': new Date().toLocaleDateString('en-IN'),
        '[Item Name]': orderData.garmentType || 'Custom Garment',
        'class=\"price\">0': `class=\"price\">${orderData.totalAmount || 0}`,
        'class=\"amount\">0': `class=\"amount\">${orderData.totalAmount || 0}`,
        'id=\"subTotal\">0': `id=\"subTotal\">${orderData.totalAmount || 0}`,
        'id=\"grandTotal\">0': `id=\"grandTotal\">${orderData.totalAmount || 0}`,
        'id=\"balance\">0': `id=\"balance\">${(orderData.totalAmount || 0) - (orderData.advanceAmount || 0)}`,
        '₹ 0.00': `₹ ${orderData.advanceAmount || 0}`
      };
      
      // Apply replacements
      Object.keys(replacements).forEach(placeholder => {
        htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), replacements[placeholder]);
      });
      
      // Update watermark paths to be relative to the invoice theme folder
      htmlContent = htmlContent.replace(/src=\"\.\/([^\"]+)\"/g, (match, filename) => {
        return `src=\"/invoice-theme/${filename}\"`;
      });
      
      // Add theme-specific styling if needed
      const themeStyles = this.getThemeStyles(themeName);
      if (themeStyles) {
        htmlContent = htmlContent.replace('</head>', `${themeStyles}</head>`);
      }
      
      // Save the generated HTML
      const outputDir = path.join(__dirname, 'pdfs');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const outputFile = `${orderData.orderId || 'invoice'}-${themeName}.html`;
      const outputPath = path.join(outputDir, outputFile);
      
      fs.writeFileSync(outputPath, htmlContent);
      
      console.log(`✅ PDF generated: ${outputFile}`);
      
      return {
        success: true,
        htmlPath: `/pdfs/${outputFile}`,
        pdfPath: `/pdfs/${outputFile}`,
        theme: themeName,
        watermark: watermarkFile
      };
      
    } catch (error) {
      console.error('❌ PDF generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  static getThemeStyles(themeName) {
    const themeStylesMap = {
      'newYear': `
        <style>
        :root {
          --theme-primary: #f59e0b;
          --theme-secondary: #eab308;
          --theme-accent: #facc15;
        }
        .invoice-container { border-color: var(--theme-primary); }
        .title, .company { color: var(--theme-primary); }
        th { background: var(--theme-primary); }
        .sign-line { border-color: var(--theme-primary); }
        </style>
      `,
      'sankranti': `
        <style>
        :root {
          --theme-primary: #f97316;
          --theme-secondary: #ea580c;
          --theme-accent: #fb923c;
        }
        .invoice-container { border-color: var(--theme-primary); }
        .title, .company { color: var(--theme-primary); }
        th { background: var(--theme-primary); }
        .sign-line { border-color: var(--theme-primary); }
        </style>
      `,
      'holi': `
        <style>
        :root {
          --theme-primary: #ec4899;
          --theme-secondary: #a855f7;
          --theme-accent: #06b6d4;
        }
        .invoice-container { border-color: var(--theme-primary); }
        .title, .company { color: var(--theme-primary); }
        th { background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary)); }
        .sign-line { border-color: var(--theme-primary); }
        </style>
      `,
      'diwali': `
        <style>
        :root {
          --theme-primary: #f59e0b;
          --theme-secondary: #d97706;
          --theme-accent: #fbbf24;
        }
        .invoice-container { border-color: var(--theme-primary); }
        .title, .company { color: var(--theme-primary); }
        th { background: var(--theme-primary); }
        .sign-line { border-color: var(--theme-primary); }
        </style>
      `,
      'christmas': `
        <style>
        :root {
          --theme-primary: #dc2626;
          --theme-secondary: #16a34a;
          --theme-accent: #fbbf24;
        }
        .invoice-container { border-color: var(--theme-primary); }
        .title, .company { color: var(--theme-primary); }
        th { background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary)); }
        .sign-line { border-color: var(--theme-primary); }
        </style>
      `
    };
    
    return themeStylesMap[themeName] || '';
  }
  
  static async generateAndSavePDFFiles(orderData, settings) {
    try {
      // Get current theme from localStorage or default
      const currentTheme = orderData.theme || 'default';
      
      console.log(`📄 Generating PDF with theme: ${currentTheme}`);
      
      const result = await this.generateThemedPDF(orderData, settings, currentTheme);
      
      if (result.success) {
        console.log(`✅ PDF generated successfully with ${currentTheme} theme`);
        console.log(`📁 File: ${result.htmlPath}`);
        console.log(`🖼️ Watermark: ${result.watermark}`);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ PDF generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = EnhancedPDFService;