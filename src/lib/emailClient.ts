import nodemailer from 'nodemailer'

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

// Verify connection configuration
transporter.verify(function (error, success) {
  if (error) {
    console.error('SMTP connection error:', error)
  } else {
    console.log('SMTP server is ready to take our messages')
  }
})

export const sendTeamNotificationEmail = async (
  to: string,
  teamName: string,
  teamId: string
) => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@example.com',
    to,
    subject: `Added to Team: ${teamName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Added to Team</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .content {
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 5px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 0.9em;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Welcome to ${teamName}!</h1>
        </div>
        
        <div class="content">
          <p>Hello,</p>
          
          <p>You have been added to the team <strong>${teamName}</strong>.</p>
          
          <p>You can now access the team's content and features by logging into your account.</p>
          
          <div style="text-align: center;">
            <a href="${siteUrl}/login?team_id=${teamId}" class="button">Go to Login</a>
          </div>
        </div>
        
        <div class="footer">
          <p>If you did not expect this notification, please ignore this email.</p>
        </div>
      </body>
      </html>
    `,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('Email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

export const sendInvitationEmail = async (
  to: string,
  teamName: string,
  invitationLink: string
) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@example.com',
    to,
    subject: `Invitation to join ${teamName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Team Invitation</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .content {
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 5px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 0.9em;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>You've Been Invited!</h1>
        </div>
        
        <div class="content">
          <p>Hello,</p>
          
          <p>You have been invited to join the team <strong>${teamName}</strong>.</p>
          
          <p>Click the button below to accept the invitation and set up your account:</p>
          
          <div style="text-align: center;">
            <a href="${invitationLink}" class="button">Accept Invitation</a>
          </div>
        </div>
        
        <div class="footer">
          <p>If you did not expect this invitation, please ignore this email.</p>
        </div>
      </body>
      </html>
    `,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('Invitation email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending invitation email:', error)
    throw error
  }
} 