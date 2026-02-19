"""
Email notification service for MatchMyRoom
Uses Resend API (preferred) with Gmail SMTP fallback
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

# Email configuration
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "onboarding@resend.dev")
APP_URL = os.getenv("APP_URL", "http://localhost:3000")


def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """Send an email using Resend (preferred) or Gmail SMTP fallback"""

    # Try Resend first
    if RESEND_API_KEY:
        return _send_via_resend(to_email, subject, html_content)

    # Fallback to SMTP
    if SMTP_USERNAME and SMTP_PASSWORD:
        return _send_via_smtp(to_email, subject, html_content)

    print("⚠️  Email not configured. Set RESEND_API_KEY or SMTP credentials in .env")
    return False


def _send_via_resend(to_email: str, subject: str, html_content: str) -> bool:
    """Send email via Resend API"""
    try:
        import resend
        resend.api_key = RESEND_API_KEY

        params = {
            "from": f"MatchMyRoom <{FROM_EMAIL}>",
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        }

        email = resend.Emails.send(params)
        print(f"✅ Email sent to {to_email} via Resend (ID: {email.get('id', 'unknown')})")
        return True

    except Exception as e:
        print(f"❌ Resend failed for {to_email}: {e}")
        # Fallback to SMTP if Resend fails
        if SMTP_USERNAME and SMTP_PASSWORD:
            print("↩️  Falling back to SMTP...")
            return _send_via_smtp(to_email, subject, html_content)
        return False


def _send_via_smtp(to_email: str, subject: str, html_content: str) -> bool:
    """Send email via Gmail SMTP (fallback)"""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"MatchMyRoom <{SMTP_USERNAME}>"
        msg["To"] = to_email

        html_part = MIMEText(html_content, "html")
        msg.attach(html_part)

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)

        print(f"✅ Email sent to {to_email} via SMTP")
        return True

    except Exception as e:
        print(f"❌ SMTP failed for {to_email}: {e}")
        return False


def send_new_matches_notification(user_email: str, user_name: str, match_count: int) -> bool:
    subject = "New Roommate Matches Found on MatchMyRoom!"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1C1917; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #ED1B2F, #B91C1C); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }}
            .header h1 {{ color: white; margin: 0; font-size: 28px; }}
            .content {{ background: #FAFAF9; padding: 30px; border-radius: 0 0 12px 12px; }}
            .button {{ display: inline-block; background: #ED1B2F; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }}
            .footer {{ text-align: center; color: #78716C; font-size: 13px; margin-top: 30px; }}
            .match-count {{ background: #22C55E; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>MatchMyRoom</h1>
            </div>
            <div class="content">
                <h2>Hey {user_name}!</h2>
                <p>Great news! We've found <span class="match-count">{match_count} new potential roommate{'s' if match_count != 1 else ''}</span> who match your lifestyle preferences.</p>
                <p>These students share similar habits, budget ranges, and location preferences with you.</p>
                <center>
                    <a href="{APP_URL}" class="button">View Your Matches</a>
                </center>
            </div>
            <div class="footer">
                <p>&copy; 2025 MatchMyRoom - Built for McGill & Concordia Students</p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(user_email, subject, html_content)


def send_welcome_email(user_email: str, user_name: str) -> bool:
    subject = "Welcome to MatchMyRoom!"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1C1917; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #ED1B2F, #912338); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }}
            .header h1 {{ color: white; margin: 0; font-size: 28px; }}
            .content {{ background: #FAFAF9; padding: 30px; border-radius: 0 0 12px 12px; }}
            .button {{ display: inline-block; background: #ED1B2F; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }}
            .footer {{ text-align: center; color: #78716C; font-size: 13px; margin-top: 30px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to MatchMyRoom!</h1>
            </div>
            <div class="content">
                <h2>Hi {user_name}!</h2>
                <p>Thanks for signing up! You're one step closer to finding your perfect roommate.</p>
                <p><strong>Next steps:</strong></p>
                <ol>
                    <li>Complete the questionnaire (takes 2 minutes)</li>
                    <li>Add a profile picture and bio</li>
                    <li>Check out your matches!</li>
                </ol>
                <center>
                    <a href="{APP_URL}" class="button">Complete Your Profile</a>
                </center>
            </div>
            <div class="footer">
                <p>&copy; 2025 MatchMyRoom - Built for McGill & Concordia Students</p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(user_email, subject, html_content)


def send_verification_code(user_email: str, user_name: str, verification_code: str) -> bool:
    subject = "Your MatchMyRoom Verification Code"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1C1917; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #ED1B2F, #B91C1C); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }}
            .header h1 {{ color: white; margin: 0; font-size: 28px; }}
            .content {{ background: #FAFAF9; padding: 30px; border-radius: 0 0 12px 12px; }}
            .code-box {{ background: #FFFFFF; border: 3px dashed #ED1B2F; padding: 20px; text-align: center; border-radius: 12px; margin: 25px 0; }}
            .code {{ font-size: 42px; font-weight: bold; color: #ED1B2F; letter-spacing: 8px; font-family: 'Courier New', monospace; }}
            .footer {{ text-align: center; color: #78716C; font-size: 13px; margin-top: 30px; }}
            .warning {{ background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 20px 0; border-radius: 4px; color: #92400E; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Verify Your Email</h1>
            </div>
            <div class="content">
                <h2>Hi {user_name}!</h2>
                <p>Welcome to MatchMyRoom! Enter the verification code below to complete your registration:</p>

                <div class="code-box">
                    <div class="code">{verification_code}</div>
                </div>

                <p style="text-align: center; color: #78716C; font-size: 14px;">
                    This code expires in <strong>15 minutes</strong>
                </p>

                <div class="warning">
                    <strong>Security Note:</strong> Never share this code with anyone.
                </div>

                <p style="margin-top: 30px; font-size: 14px; color: #78716C;">
                    If you didn't create a MatchMyRoom account, please ignore this email.
                </p>
            </div>
            <div class="footer">
                <p>&copy; 2025 MatchMyRoom - Built for McGill & Concordia Students</p>
                <p style="font-size: 11px;">This email was sent to {user_email}</p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(user_email, subject, html_content)


def send_like_notification(user_email: str, user_name: str, liker_name: str) -> bool:
    """Send email when someone swipes right (likes) a user"""
    subject = f"{liker_name} is interested in being your roommate!"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1C1917; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #ED1B2F, #B91C1C); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }}
            .header h1 {{ color: white; margin: 0; font-size: 28px; }}
            .content {{ background: #FAFAF9; padding: 30px; border-radius: 0 0 12px 12px; }}
            .match-name {{ background: #ED1B2F; color: white; padding: 16px; text-align: center; border-radius: 12px; margin: 25px 0; }}
            .match-name h3 {{ font-size: 24px; margin: 0; }}
            .button {{ display: inline-block; background: #ED1B2F; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 25px auto; text-align: center; }}
            .footer {{ text-align: center; color: #78716C; font-size: 13px; margin-top: 30px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Someone likes you!</h1>
            </div>
            <div class="content">
                <h2>Hi {user_name}!</h2>
                <p><strong>{liker_name}</strong> swiped right on your profile and is interested in being your roommate!</p>

                <div class="match-name">
                    <h3>{liker_name}</h3>
                    <p>wants to be your roommate!</p>
                </div>

                <p>Head over to MatchMyRoom to check out their profile and swipe back if you're interested.</p>

                <center>
                    <a href="{APP_URL}" class="button">View on MatchMyRoom</a>
                </center>
            </div>
            <div class="footer">
                <p>&copy; 2025 MatchMyRoom - Built for McGill & Concordia Students</p>
                <p style="font-size: 11px;">This email was sent to {user_email}</p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(user_email, subject, html_content)


def send_mutual_match_notification(user_email: str, user_name: str, matcher_name: str) -> bool:
    """Send email when both users have liked each other (mutual match)"""
    subject = f"It's a mutual match with {matcher_name}!"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1C1917; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #ED1B2F, #B91C1C); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }}
            .header h1 {{ color: white; margin: 0; font-size: 28px; }}
            .content {{ background: #FAFAF9; padding: 30px; border-radius: 0 0 12px 12px; }}
            .match-name {{ background: #ED1B2F; color: white; padding: 16px; text-align: center; border-radius: 12px; margin: 25px 0; }}
            .match-name h3 {{ font-size: 24px; margin: 0; }}
            .button {{ display: inline-block; background: #ED1B2F; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 25px auto; text-align: center; }}
            .footer {{ text-align: center; color: #78716C; font-size: 13px; margin-top: 30px; }}
            .emoji {{ font-size: 48px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>It's a Match! 🎉</h1>
            </div>
            <div class="content">
                <h2>Hi {user_name}!</h2>
                <p>Great news! <strong>{matcher_name}</strong> has liked your profile on MatchMyRoom!</p>

                <div class="match-name">
                    <div class="emoji">❤️</div>
                    <h3>{matcher_name}</h3>
                    <p>is interested in being your roommate!</p>
                </div>

                <p>This could be the start of finding your perfect match. Head over to MatchMyRoom to message them and learn more about each other.</p>

                <center>
                    <a href="{APP_URL}" class="button">View Your Match & Message</a>
                </center>

                <p style="margin-top: 30px; font-size: 14px; color: #78716C; text-align: center;">
                    Happy matching! 🏠
                </p>
            </div>
            <div class="footer">
                <p>&copy; 2025 MatchMyRoom - Built for McGill & Concordia Students</p>
                <p style="font-size: 11px;">This email was sent to {user_email}</p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(user_email, subject, html_content)
