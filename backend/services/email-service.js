// ============================================================================
// EMAIL SERVICE - WITH OTP VERIFICATION (USING RESEND)
// backend/services/email-service.js
// ============================================================================

const { Resend } = require('resend');

// ============================================================================
// CONFIGURATION
// ============================================================================

const EMAIL_CONFIG = {
  apiKey: process.env.RESEND_API_KEY,
  from: process.env.EMAIL_FROM || 'SkillBuddy <noreply@skillbuddy.com>',
  enabled: process.env.ENABLE_EMAIL_VERIFICATION === 'true',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
};

// ============================================================================
// CREATE RESEND INSTANCE
// ============================================================================

let resend = null;

function initializeEmailService() {
  if (!EMAIL_CONFIG.enabled) {
    console.log('📧 Email Service: DISABLED');
    return null;
  }

  if (!EMAIL_CONFIG.apiKey) {
    console.warn('⚠️ Resend API Key missing in .env file (RESEND_API_KEY)');
    return null;
  }

  try {
    resend = new Resend(EMAIL_CONFIG.apiKey);

    console.log('✅ Email Service Initialized (Resend)');
    console.log('   From:', EMAIL_CONFIG.from);
    console.log('   Enabled:', EMAIL_CONFIG.enabled);

    return resend;
  } catch (error) {
    console.error('❌ Email Service Error:', error.message);
    return null;
  }
}

// Initialize resend on module load
resend = initializeEmailService();

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP Email
async function sendOTPEmail(email, name, otp) {
  if (!resend) {
    return {
      success: false,
      message: 'Email service not configured'
    };
  }

  try {
    console.log('📧 Sending OTP email to:', email);

    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: email,
      subject: 'Verify Your SkillBuddy Account - OTP Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: #f4f6f9;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 30px auto;
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 40px 20px;
              text-align: center;
              color: white;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              color: #333;
              margin-bottom: 20px;
            }
            .otp-box {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 12px;
              padding: 30px;
              text-align: center;
              margin: 30px 0;
            }
            .otp-label {
              color: white;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 10px;
            }
            .otp-code {
              font-size: 48px;
              font-weight: bold;
              color: white;
              letter-spacing: 8px;
              font-family: 'Courier New', monospace;
              margin: 10px 0;
            }
            .otp-validity {
              color: rgba(255,255,255,0.9);
              font-size: 13px;
              margin-top: 10px;
            }
            .message {
              color: #666;
              line-height: 1.8;
              font-size: 15px;
              margin: 20px 0;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
              color: #856404;
              font-size: 14px;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px 30px;
              text-align: center;
              color: #666;
              font-size: 13px;
              border-top: 1px solid #e9ecef;
            }
            .footer a {
              color: #667eea;
              text-decoration: none;
            }
            .steps {
              background: #f8f9fa;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .steps ol {
              margin: 0;
              padding-left: 20px;
              color: #495057;
            }
            .steps li {
              margin: 10px 0;
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 SkillBuddy</h1>
            </div>
            
            <div class="content">
              <div class="greeting">
                Hello ${name}! 👋
              </div>
              
              <p class="message">
                Thank you for registering with <strong>SkillBuddy</strong>! 
                To complete your registration and verify your email address, 
                please use the following One-Time Password (OTP):
              </p>
              
              <div class="otp-box">
                <div class="otp-label">Your Verification Code</div>
                <div class="otp-code">${otp}</div>
                <div class="otp-validity">⏰ Valid for 10 minutes</div>
              </div>
              
              <div class="steps">
                <strong>How to verify your account:</strong>
                <ol>
                  <li>Return to the SkillBuddy verification page</li>
                  <li>Enter the 6-digit OTP code above</li>
                  <li>Click "Verify" to activate your account</li>
                  <li>Start your learning journey!</li>
                </ol>
              </div>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong><br>
                • This OTP will expire in 10 minutes<br>
                • Never share this code with anyone<br>
                • If you didn't request this, please ignore this email
              </div>
              
              <p class="message">
                If you're having trouble, please contact our support team.
              </p>
            </div>
            
            <div class="footer">
              <p>
                This email was sent by <strong>SkillBuddy</strong><br>
                Need help? <a href="mailto:support@skillbuddy.com">Contact Support</a>
              </p>
              <p style="margin-top: 15px; color: #999; font-size: 12px;">
                © ${new Date().getFullYear()} SkillBuddy. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Error sending OTP email (Resend):', error);
      return {
        success: false,
        message: error.message
      };
    }

    console.log('✅ OTP Email sent successfully:', data.id);

    return {
      success: true,
      message: 'OTP email sent successfully',
      messageId: data.id
    };
  } catch (error) {
    console.error('❌ Unexpected error sending OTP email:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Send Welcome Email (after successful verification)
async function sendWelcomeEmail(email, name) {
  if (!resend) {
    return { success: false, message: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: email,
      subject: 'Welcome to SkillBuddy! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .feature { background: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to SkillBuddy!</h1>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>Your account has been successfully verified! We're excited to have you join our learning community.</p>
              
              <div class="feature">
                <strong>📚 Personalized Learning Paths</strong><br>
                Get customized courses based on your goals
              </div>
              <div class="feature">
                <strong>🎯 Interactive Assessments</strong><br>
                Test your knowledge and track progress
              </div>
              <div class="feature">
                <strong>🏆 Leaderboard & Achievements</strong><br>
                Compete with peers and earn rewards
              </div>
              
              <div style="text-align: center;">
                <a href="${EMAIL_CONFIG.frontendUrl}/login" class="button">
                  Start Learning Now
                </a>
              </div>
              
              <p style="color: #666; margin-top: 30px;">
                If you have any questions, feel free to reach out to our support team.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Error sending welcome email (Resend):', error);
      return { success: false, message: error.message };
    }

    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Unexpected error sending welcome email:', error);
    return { success: false, message: error.message };
  }
}

// Send Password Reset OTP
async function sendPasswordResetEmail(email, name, otp) {
  if (!resend) {
    return {
      success: false,
      message: 'Email service not configured'
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: email,
      subject: 'Reset Your SkillBuddy Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f6f9; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #d53369 0%, #daae51 100%); padding: 40px 20px; text-align: center; color: white; }
            .content { padding: 40px 30px; }
            .otp-box { background: linear-gradient(135deg, #d53369 0%, #daae51 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; color: white; }
            .otp-code { font-size: 48px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace; margin: 10px 0; }
            .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #666; font-size: 13px; border-top: 1px solid #e9ecef; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset</h1>
            </div>
            <div class="content">
              <h3>Hello ${name},</h3>
              <p>We received a request to reset your password. Use the code below to proceed:</p>
              
              <div class="otp-box">
                <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Reset Code</div>
                <div class="otp-code">${otp}</div>
                <div style="font-size: 13px;">⏰ Valid for 10 minutes</div>
              </div>
              
              <p>If you didn't request this, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} SkillBuddy. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Error sending password reset email (Resend):', error);
      return { success: false, message: error.message };
    }

    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Unexpected error sending password reset email:', error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  generateOTP,
  sendOTPEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail
};