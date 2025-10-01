const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // For development, we'll use a console logger instead of real emails
    this.transporter = null;
    
    // Only create transporter if SMTP credentials are provided
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  // Send order confirmation email
  async sendOrderConfirmation(order, user) {
    try {
      const subject = `Order Confirmation - #${order.orderNumber}`;
      const html = this.generateOrderConfirmationTemplate(order, user);

      // If transporter is available, send real email
      if (this.transporter) {
        await this.transporter.sendMail({
          from: `"TechStore" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to: user.email,
          subject,
          html,
        });
        console.log(`✅ Order confirmation email sent to ${user.email}`);
      } else {
        // Development mode - just log to console
        console.log(`📧 [DEV] Order confirmation email would be sent to: ${user.email}`);
        console.log(`📦 Order #${order.orderNumber} for ${user.fullName}`);
        console.log(`💰 Total: $${order.finalAmount}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Order confirmation email error:', error);
      return false;
    }
  }

  // Send shipping update email
  async sendShippingUpdate(order, user, update) {
    try {
      const subject = `Shipping Update - Order #${order.orderNumber}`;
      const html = this.generateShippingUpdateTemplate(order, user, update);

      if (this.transporter) {
        await this.transporter.sendMail({
          from: `"TechStore" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to: user.email,
          subject,
          html,
        });
        console.log(`✅ Shipping update email sent to ${user.email}`);
      } else {
        console.log(`📧 [DEV] Shipping update email would be sent to: ${user.email}`);
        console.log(`🚚 Order #${order.orderNumber} status: ${update.status}`);
        if (update.trackingNumber) {
          console.log(`📦 Tracking: ${update.trackingNumber}`);
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Shipping update email error:', error);
      return false;
    }
  }

  // Send guest order confirmation
  async sendGuestOrderConfirmation(order, guestInfo) {
    try {
      const subject = `Order Confirmation - #${order.orderNumber}`;
      const html = this.generateGuestOrderConfirmationTemplate(order, guestInfo);

      if (this.transporter) {
        await this.transporter.sendMail({
          from: `"TechStore" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to: guestInfo.email,
          subject,
          html,
        });
        console.log(`✅ Guest order confirmation email sent to ${guestInfo.email}`);
      } else {
        console.log(`📧 [DEV] Guest order confirmation email would be sent to: ${guestInfo.email}`);
        console.log(`📦 Guest Order #${order.orderNumber} for ${guestInfo.fullName}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Guest order confirmation email error:', error);
      return false;
    }
  }

  // Generate order confirmation email template
  generateOrderConfirmationTemplate(order, user) {
    const orderDate = new Date(order.createdAt).toLocaleDateString();
    const itemsHtml = order.items.map(item => `
      <div style="margin: 10px 0; padding: 10px; border-bottom: 1px solid #eee;">
        <strong>${item.name}</strong><br>
        Quantity: ${item.quantity} × $${item.price}
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #001f3f; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .order-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TechStore</h1>
            <h2>Order Confirmed!</h2>
          </div>
          <div class="content">
            <p>Hi ${user.fullName},</p>
            <p>Thank you for your order! We're getting it ready to be shipped.</p>
            
            <div class="order-details">
              <h3>Order Details</h3>
              <p><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p><strong>Order Date:</strong> ${orderDate}</p>
              <p><strong>Total Amount:</strong> $${order.finalAmount}</p>
              
              <h4>Items Ordered:</h4>
              ${itemsHtml}
            </div>
            
            <p>We'll notify you when your order ships.</p>
            <p>Thank you for shopping with TechStore!</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 TechStore. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate shipping update email template
  generateShippingUpdateTemplate(order, user, update) {
    const estimatedDelivery = update.estimatedDelivery ? 
      new Date(update.estimatedDelivery).toLocaleDateString() : 'Not available';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #001f3f; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .tracking-info { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TechStore</h1>
            <h2>Shipping Update</h2>
          </div>
          <div class="content">
            <p>Hi ${user.fullName},</p>
            <p>Your order #${order.orderNumber} has been ${update.status}.</p>
            
            <div class="tracking-info">
              <h3>Shipping Information</h3>
              <p><strong>Status:</strong> ${update.status}</p>
              ${update.trackingNumber ? `<p><strong>Tracking Number:</strong> ${update.trackingNumber}</p>` : ''}
              ${update.carrier ? `<p><strong>Carrier:</strong> ${update.carrier}</p>` : ''}
              <p><strong>Estimated Delivery:</strong> ${estimatedDelivery}</p>
            </div>
            
            <p>You can track your order anytime on our website.</p>
            <p>Thank you for shopping with TechStore!</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 TechStore. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate guest order confirmation template
  generateGuestOrderConfirmationTemplate(order, guestInfo) {
    const orderDate = new Date(order.createdAt).toLocaleDateString();
    const itemsHtml = order.items.map(item => `
      <div style="margin: 10px 0; padding: 10px; border-bottom: 1px solid #eee;">
        <strong>${item.name}</strong><br>
        Quantity: ${item.quantity} × $${item.price}
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #001f3f; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .order-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>TechStore</h1>
            <h2>Order Confirmed!</h2>
          </div>
          <div class="content">
            <p>Hi ${guestInfo.fullName},</p>
            <p>Thank you for your order! We're getting it ready to be shipped.</p>
            
            <div class="order-details">
              <h3>Order Details</h3>
              <p><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p><strong>Order Date:</strong> ${orderDate}</p>
              <p><strong>Total Amount:</strong> $${order.finalAmount}</p>
              
              <h4>Items Ordered:</h4>
              ${itemsHtml}
            </div>
            
            <p><strong>Important:</strong> Save your order number (<strong>${order.orderNumber}</strong>) to track your order.</p>
            <p>We'll notify you when your order ships.</p>
            <p>Thank you for shopping with TechStore!</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 TechStore. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();