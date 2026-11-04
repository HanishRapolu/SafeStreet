const { sendMail } = require('../utils/emailService');

// Subscribe to newsletter
const subscribeToNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    // Create confirmation email content
    const subject = 'Thank You for Subscribing to SafeStreets Newsletter';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1976d2; padding: 20px; text-align: center; color: white;">
          <h1 style="margin: 0;">SafeStreets</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f8f8f8; border: 1px solid #ddd;">
          <h2>Thank You for Subscribing!</h2>
          
          <p>You've successfully subscribed to the SafeStreets newsletter.</p>
          
          <p>You'll now receive regular updates about our product features, AI advancements, 
          and best practices in road maintenance.</p>
          
          <p>If you didn't subscribe to our newsletter, please disregard this email.</p>
          
          <p>Best regards,<br>SafeStreets Team</p>
        </div>
        
        <div style="text-align: center; color: #666; padding: 10px; font-size: 12px;">
          <p>© ${new Date().getFullYear()} SafeStreets AI. All rights reserved.</p>
          <p>You can unsubscribe at any time by clicking the unsubscribe link in our emails.</p>
        </div>
      </div>
    `;

    // Send the confirmation email
    await sendMail({
      to: email,
      subject,
      html,
      text: `
Thank You for Subscribing!

You've successfully subscribed to the SafeStreets newsletter.

You'll now receive regular updates about our product features, AI advancements, 
and best practices in road maintenance.

If you didn't subscribe to our newsletter, please disregard this email.

Best regards,
SafeStreets Team

© ${new Date().getFullYear()} SafeStreets AI. All rights reserved.
You can unsubscribe at any time by clicking the unsubscribe link in our emails.
      `
    });

    res.status(200).json({ 
      success: true, 
      message: 'Subscription successful! You will now receive our newsletter.' 
    });
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    res.status(500).json({ 
      message: 'Failed to process subscription', 
      error: error.message 
    });
  }
};

module.exports = {
  subscribeToNewsletter
};
