"""SMTP adapter. Only expected transport failures are translated into safe codes."""

import math
import re
import smtplib
import ssl
from email.headerregistry import Address


class EmailTransportError(Exception):
    def __init__(self, code: str, retry_safe: bool = False):
        super().__init__(code)
        self.code = code
        self.retry_safe = retry_safe


def validate_email_address(value):
    # Bare ASCII mailboxes only; never allow header syntax or recipient lists.
    if (
        not isinstance(value, str)
        or not value.isascii()
        or len(value) > 254
        or not re.fullmatch(
            r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+", value
        )
    ):
        raise EmailTransportError("invalid_address", True)
    try:
        address = Address(addr_spec=value)
    except ValueError:
        raise EmailTransportError("invalid_address", True) from None
    return address.addr_spec


class SMTPTransport:
    def __init__(self, config):
        self.config = config

    def send(self, message):
        config = self.config
        host = config.get("SMTP_HOST")
        port = config.get("SMTP_PORT")
        security = config.get("SMTP_SECURITY")
        timeout = config.get("SMTP_TIMEOUT_SECONDS")
        username = config.get("SMTP_USERNAME")
        password = config.get("SMTP_PASSWORD")
        if (
            not isinstance(host, str)
            or not host.strip()
            or host.endswith(".invalid")
            or any(char.isspace() for char in host)
            or not isinstance(port, int)
            or isinstance(port, bool)
            or not 1 <= port <= 65535
            or security not in {"starttls", "ssl"}
            or not isinstance(timeout, (int, float))
            or isinstance(timeout, bool)
            or not math.isfinite(timeout)
            or not 1 <= timeout <= 60
            or bool(username) != bool(password)
        ):
            raise EmailTransportError("configuration", True)
        sender = validate_email_address(config.get("SMTP_SENDER"))
        recipient = validate_email_address(str(message["To"]))
        context = ssl.create_default_context()
        try:
            if security == "ssl":
                client = smtplib.SMTP_SSL(host, port, timeout=timeout, context=context)
            else:
                client = smtplib.SMTP(host, port, timeout=timeout)
        except (smtplib.SMTPException, OSError):
            raise EmailTransportError("connection", True) from None
        try:
            try:
                if security == "starttls":
                    client.starttls(context=context)
                if username:
                    client.login(username, password)
            except smtplib.SMTPAuthenticationError:
                raise EmailTransportError("authentication", True) from None
            except (smtplib.SMTPException, OSError):
                raise EmailTransportError("secure_connection", True) from None
            try:
                refused = client.send_message(message, from_addr=sender, to_addrs=[recipient])
                if refused:
                    raise EmailTransportError("rejected", True)
            except (
                smtplib.SMTPRecipientsRefused,
                smtplib.SMTPSenderRefused,
                smtplib.SMTPDataError,
            ):
                raise EmailTransportError("rejected", True) from None
            except (smtplib.SMTPException, OSError):
                # DATA may have been accepted. Do not automatically retry this outcome.
                raise EmailTransportError("delivery_unknown") from None
        finally:
            try:
                client.close()
            except OSError:
                pass
