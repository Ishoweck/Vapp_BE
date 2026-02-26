import { Resend } from 'resend';
import { logger } from './logger';

import dotenv from "dotenv"

dotenv.config()

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'VendorSpot <noreply@vendorspot.com>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    if (error) {
      logger.error('Resend error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    logger.info(`Email sent to ${options.to}`, { emailId: data?.id });
  } catch (error) {
    logger.error('Email sending error:', error);
    throw new Error('Failed to send email');
  }
};

export const sendOTPEmail = async (email: string, otp: string): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ff6600;">VendorSpot - Verification Code</h2>
      <p>Your verification code is:</p>
      <h1 style="color: #ff6600; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'VendorSpot - Email Verification',
    html,
  });
};

export const sendPasswordResetEmail = async (email: string, resetCode: string): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ff6600;">VendorSpot - Password Reset</h2>
      <p>You requested to reset your password. Use the code below to reset it:</p>
      <h1 style="color: #ff6600; font-size: 32px; letter-spacing: 5px; text-align: center;">${resetCode}</h1>
      <p>Enter this code in the app to reset your password.</p>
      <p>This code will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'VendorSpot - Password Reset Code',
    html,
  });
};

export const sendWelcomeEmail = async (email: string, name: string): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ff6600;">Welcome to VendorSpot! 🎉</h2>
      <p>Hi ${name},</p>
      <p>Thank you for joining VendorSpot - your one-stop marketplace for everything!</p>
      <p>Get started by:</p>
      <ul>
        <li>Browsing our products</li>
        <li>Setting up your profile</li>
        <li>Becoming a vendor or affiliate</li>
      </ul>
      <p>Happy shopping!</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Welcome to VendorSpot!',
    html,
  });
};

export const sendOrderConfirmationEmail = async (
  email: string,
  orderNumber: string,
  total: number
): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ff6600;">Order Confirmation</h2>
      <p>Thank you for your order!</p>
      <p><strong>Order Number:</strong> ${orderNumber}</p>
      <p><strong>Total:</strong> ₦${total.toLocaleString()}</p>
      <p>We'll send you another email when your order ships.</p>
      <a href="${process.env.FRONTEND_URL}/orders/${orderNumber}" style="display: inline-block; padding: 12px 24px; background-color: #ff6600; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">View Order</a>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: `Order Confirmation - ${orderNumber}`,
    html,
  });
};

export const sendFounderWelcomeEmail = async (email: string): Promise<void> => {
  const html = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      .container { padding: 20px; font-family: Arial, sans-serif; color: #333; }
      .subtext { font-size: 16px; margin-bottom: 20px; line-height: 1.6; }
      .footer { font-size: 14px; color: #666; margin-top: 30px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Hello and welcome to Vendorspot,</h2>
      
      <p class="subtext">
        I'm personally excited to have you onboard as a vendor. Thank you for creating your store and trusting Vendorspot as a platform to grow your business.
      </p>
      
      <p class="subtext">
        Vendorspot was built to help businesses like yours sell with confidence, reach the right customers, and operate in a safer, more structured online marketplace. Our team is committed to supporting you every step of the way.
      </p>
      
      <p class="subtext">
        Keep listing your products, share your store link, and stay active on the platform to unlock more visibility and opportunities.
      </p>
      
      <p class="subtext">
        We're glad to have you here, and we look forward to growing together.
      </p>
      
      <p class="footer">Warm regards,</p>
      <p class="footer"><strong>Olayinka Olasunkanmi</strong><br>Founder, Vendorspot</p>
    </div>
  </body>
</html>
  `;

  await sendEmail({
    to: email,
    subject: 'Founder Welcome Note',
    html,
  });
};

export const sendProductPostingGuideEmail = async (email: string): Promise<void> => {
  const html = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      .container { padding: 20px; font-family: Arial, sans-serif; color: #333; }
      .subtext { font-size: 16px; margin-bottom: 15px; line-height: 1.6; }
      .section-title { font-weight: bold; font-size: 18px; margin-top: 25px; margin-bottom: 10px; color: #D7195B; }
      .step-list { margin-left: 20px; line-height: 1.8; }
      .step-list li { margin-bottom: 10px; }
      .example { background-color: #f5f5f5; padding: 10px; border-left: 3px solid #D7195B; margin: 10px 0; }
      .link { color: #0071FC; text-decoration: underline; }
      .footer { font-size: 14px; color: #666; margin-top: 30px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Dear Vendor,</h2>
      
      <p class="subtext">
        Welcome to Vendorspot, and thank you for choosing to sell with us. We're excited to have you on the platform and look forward to supporting your business growth.
      </p>
      
      <p class="subtext">
        To ensure your products are approved quickly and visible to customers, please follow the steps below when posting your products:
      </p>
      
      <div class="section-title">How to Post a Product on Vendorspot</div>
      
      <ol class="step-list">
        <li>Log in to your dashboard and click the <strong>Menu</strong>.</li>
        <li>Select <strong>Products</strong>, then click <strong>Add New Product</strong>.</li>
        <li>When adding a product, kindly ensure the following details are provided correctly:</li>
      </ol>
      
      <div style="margin-left: 40px;">
        <p><strong>Product Name:</strong></p>
        <div class="example">Example: Women's Ankara Handbag</div>
        
        <p><strong>Product Price:</strong></p>
        <div class="example">Example: ₦15,000</div>
        
        <p><strong>Sale Price (optional):</strong></p>
        <div class="example">Example: ₦12,000 (if discounted)</div>
        
        <p><strong>Product Quantity:</strong></p>
        <div class="example">Example: 10 units available</div>
        
        <p><strong>Product Category:</strong></p>
        <p class="subtext">Select the most appropriate category for your product.</p>
        
        <p><strong>Stock Status:</strong></p>
        <p class="subtext">Change from <em>Out of Stock</em> to <em>In Stock</em>.</p>
        
        <p><strong>Product Images:</strong></p>
        <ul>
          <li>Upload at least 2 clear and sharp images of the product.</li>
          <li>Images should not contain watermarks and should show only the product.</li>
        </ul>
        
        <p><strong>Product Description:</strong></p>
        <p class="subtext">Write a clear description of at least 200 characters, explaining what the product is, its features, size, material, and benefits.</p>
        <div class="example">
          <strong>Example:</strong><br>
          This women's Ankara handbag is made with high-quality fabric, durable lining, and a secure zipper. It is stylish, lightweight, and suitable for casual and corporate outings.
        </div>
      </div>
      
      <div class="section-title">Additional Features You Can Use</div>
      <ul class="step-list">
        <li>Use <strong>Flash Sales</strong> if your product is highly discounted and ready for quick sales.</li>
        <li>Use <strong>"Product Comes in Different Options"</strong> if your product has multiple sizes, colors, or variations. This helps customers buy easily without confusion.</li>
      </ul>
      
      <p class="subtext">
        For visual guidance, you can also watch our YouTube video on how to post products and navigate Vendorspot effectively: 
        <a href="https://youtu.be/9Uc1eMx6F_A?si=hTVKikjVTE754tzt" class="link">https://youtu.be/9Uc1eMx6F_A?si=hTVKikjVTE754tzt</a>
      </p>
      
      <p class="subtext">
        If you need any assistance, please feel free to reply to this email or contact our support team. We're here to help you succeed.
      </p>
      
      <p class="subtext">
        Welcome once again, and happy selling on Vendorspot.
      </p>
      
      <p class="footer">Warm regards,</p>
      <p class="footer">The Vendorspot Team<br><a href="https://vendorspotng.com" class="link">Vendorspotng.com</a></p>
    </div>
  </body>
</html>
  `;

  await sendEmail({
    to: email,
    subject: 'Welcome to Vendorspot - How to post product on Vendorspot',
    html,
  });
};