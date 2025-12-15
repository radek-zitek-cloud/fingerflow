"""
Email Service

Configurable email sending with support for multiple providers:
- SMTP (Gmail, Outlook, custom)
- SendGrid
- AWS SES
- Mailgun
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
import aiosmtplib

from app.config import settings
from app.logging_config import get_logger

logger = get_logger(__name__)


class EmailService:
    """Email service with support for multiple providers."""

    def __init__(self):
        self.provider = settings.email_provider
        self.from_email = settings.email_from
        self.from_name = settings.email_from_name

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
    ) -> bool:
        """
        Send an email using the configured provider.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_body: HTML content of the email
            text_body: Plain text fallback (optional)

        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            if self.provider == "smtp":
                return await self._send_smtp(to_email, subject, html_body, text_body)
            elif self.provider == "sendgrid":
                return await self._send_sendgrid(to_email, subject, html_body, text_body)
            elif self.provider == "console":
                # Console provider for development - just log the email
                return await self._send_console(to_email, subject, html_body, text_body)
            else:
                logger.error("email_send_failed", reason="unknown_provider", provider=self.provider)
                return False

        except Exception as e:
            logger.error("email_send_exception", error=str(e), to_email=to_email)
            return False

    async def _send_smtp(
        self, to_email: str, subject: str, html_body: str, text_body: Optional[str]
    ) -> bool:
        """Send email using SMTP."""
        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email

            # Add plain text part
            if text_body:
                message.attach(MIMEText(text_body, "plain"))

            # Add HTML part
            message.attach(MIMEText(html_body, "html"))

            # Send email
            await aiosmtplib.send(
                message,
                hostname=settings.smtp_host,
                port=settings.smtp_port,
                username=settings.smtp_username,
                password=settings.smtp_password,
                use_tls=settings.smtp_use_tls,
            )

            logger.info("email_sent_smtp", to_email=to_email, subject=subject)
            return True

        except Exception as e:
            logger.error("smtp_send_failed", error=str(e), to_email=to_email)
            return False

    async def _send_sendgrid(
        self, to_email: str, subject: str, html_body: str, text_body: Optional[str]
    ) -> bool:
        """Send email using SendGrid API."""
        try:
            # TODO: Implement SendGrid integration
            # Requires: pip install sendgrid
            logger.warning("sendgrid_not_implemented", message="SendGrid provider not yet implemented")
            return False

        except Exception as e:
            logger.error("sendgrid_send_failed", error=str(e), to_email=to_email)
            return False

    async def _send_console(
        self, to_email: str, subject: str, html_body: str, text_body: Optional[str]
    ) -> bool:
        """Log email to console (for development)."""
        logger.info(
            "email_console_output",
            to_email=to_email,
            subject=subject,
            html_preview=html_body[:200],
        )
        print("\n" + "=" * 80)
        print(f"EMAIL TO: {to_email}")
        print(f"SUBJECT: {subject}")
        print("=" * 80)
        print(text_body if text_body else html_body)
        print("=" * 80 + "\n")
        return True

    async def send_verification_email(self, to_email: str, token: str) -> bool:
        """Send email verification link."""
        verification_url = f"{settings.frontend_url}/verify-email?token={token}"

        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4a9eff;">Welcome to FingerFlow!</h2>
                <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
                <p style="margin: 30px 0;">
                    <a href="{verification_url}"
                       style="background-color: #4a9eff; color: white; padding: 12px 24px;
                              text-decoration: none; border-radius: 6px; display: inline-block;">
                        Verify Email Address
                    </a>
                </p>
                <p style="color: #666; font-size: 14px;">
                    Or copy and paste this link into your browser:<br>
                    <a href="{verification_url}">{verification_url}</a>
                </p>
                <p style="color: #666; font-size: 14px;">
                    This link will expire in 24 hours.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px;">
                    If you didn't create an account, you can safely ignore this email.
                </p>
            </body>
        </html>
        """

        text_body = f"""
        Welcome to FingerFlow!

        Thank you for registering. Please verify your email address by visiting:
        {verification_url}

        This link will expire in 24 hours.

        If you didn't create an account, you can safely ignore this email.
        """

        return await self.send_email(to_email, "Verify Your Email - FingerFlow", html_body, text_body)

    async def send_password_reset_email(self, to_email: str, token: str) -> bool:
        """Send password reset link."""
        reset_url = f"{settings.frontend_url}/reset-password?token={token}"

        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4a9eff;">Password Reset Request</h2>
                <p>You requested to reset your password. Click the link below to create a new password:</p>
                <p style="margin: 30px 0;">
                    <a href="{reset_url}"
                       style="background-color: #4a9eff; color: white; padding: 12px 24px;
                              text-decoration: none; border-radius: 6px; display: inline-block;">
                        Reset Password
                    </a>
                </p>
                <p style="color: #666; font-size: 14px;">
                    Or copy and paste this link into your browser:<br>
                    <a href="{reset_url}">{reset_url}</a>
                </p>
                <p style="color: #666; font-size: 14px;">
                    This link will expire in 1 hour.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px;">
                    If you didn't request a password reset, you can safely ignore this email.
                </p>
            </body>
        </html>
        """

        text_body = f"""
        Password Reset Request

        You requested to reset your password. Visit this link to create a new password:
        {reset_url}

        This link will expire in 1 hour.

        If you didn't request a password reset, you can safely ignore this email.
        """

        return await self.send_email(to_email, "Reset Your Password - FingerFlow", html_body, text_body)

    async def send_2fa_code_email(self, to_email: str, code: str) -> bool:
        """Send 2FA backup code email."""
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4a9eff;">Two-Factor Authentication</h2>
                <p>Your two-factor authentication code is:</p>
                <p style="margin: 30px 0;">
                    <strong style="font-size: 32px; letter-spacing: 4px; color: #4a9eff;">
                        {code}
                    </strong>
                </p>
                <p style="color: #666; font-size: 14px;">
                    This code will expire in 10 minutes.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px;">
                    If you didn't request this code, please secure your account immediately.
                </p>
            </body>
        </html>
        """

        text_body = f"""
        Two-Factor Authentication

        Your two-factor authentication code is: {code}

        This code will expire in 10 minutes.

        If you didn't request this code, please secure your account immediately.
        """

        return await self.send_email(to_email, "Your 2FA Code - FingerFlow", html_body, text_body)


# Global email service instance
email_service = EmailService()
