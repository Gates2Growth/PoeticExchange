import { MailService } from '@sendgrid/mail';
import { User, Poem } from '@shared/schema';

// Initialize SendGrid client
const mailService = new MailService();

// This is a safeguard to ensure we don't try to send emails without an API key
let sendgridReady = false;

// Only set the API key if it exists
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
  sendgridReady = true;
}

/**
 * Send an email notification for a new poem
 * @param author The user who wrote the poem
 * @param recipient The user who will receive the notification
 * @param poem The poem that was created
 * @returns True if the email was sent successfully, false otherwise
 */
export async function sendNewPoemEmail(
  author: User,
  recipient: User,
  poem: Poem
): Promise<boolean> {
  // Don't proceed if SendGrid is not set up
  if (!sendgridReady || !recipient.email) {
    return false;
  }

  try {
    // Create email content
    const msg = {
      to: recipient.email,
      from: 'notifications@poetic-exchange.com', // Replace with your verified sender
      subject: `${author.displayName} shared a new poem: ${poem.title}`,
      text: `Your friend ${author.displayName} just shared a new poem titled "${poem.title}". Log in to view it!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4A6EE0;">New Poem from ${author.displayName}</h2>
          <p>Your friend ${author.displayName} just shared a new poem:</p>
          <div style="background-color: #f5f7ff; padding: 20px; border-radius: 5px; margin: 15px 0;">
            <h3 style="margin-top: 0;">${poem.title}</h3>
            <p style="color: #666; font-style: italic;">Log in to read the full poem</p>
          </div>
          <a href="https://poetic-exchange.com/poems/${poem.id}" style="background-color: #4A6EE0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Read Now</a>
          <p style="color: #888; font-size: 0.9em; margin-top: 20px;">
            You're receiving this because you're connected with ${author.displayName} on Poetic Exchange.
            <br>
            To stop receiving these emails, update your notification settings in your profile.
          </p>
        </div>
      `,
    };

    // Send the email
    await mailService.send(msg);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

/**
 * Send an SMS notification for a new poem
 * This is a placeholder for future implementation
 */
export async function sendNewPoemSms(
  author: User,
  recipient: User,
  poem: Poem
): Promise<boolean> {
  // This would use a service like Twilio to send SMS notifications
  // For now, just log the info
  if (!recipient.phone) {
    return false;
  }
  
  console.log(`Would send SMS to ${recipient.phone}: New poem "${poem.title}" from ${author.displayName}`);
  return true;
}

/**
 * Send notification about a new poem through all available channels based on user preferences
 */
export async function notifyAboutNewPoem(
  author: User,
  recipient: User,
  poem: Poem
): Promise<void> {
  if (!recipient.notificationPreferences) {
    return;
  }
  
  const prefs = recipient.notificationPreferences;
  
  // Parse preferences if needed
  const preferences = typeof prefs === 'string' ? JSON.parse(prefs) : prefs;
  
  // Send email notification if enabled
  if (preferences.email && recipient.email) {
    await sendNewPoemEmail(author, recipient, poem);
  }
  
  // Send SMS notification if enabled
  if (preferences.sms && recipient.phone) {
    await sendNewPoemSms(author, recipient, poem);
  }
}