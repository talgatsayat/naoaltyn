from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.core.config import settings

def _get_conf():
    return ConnectionConfig(
        MAIL_USERNAME=settings.MAIL_USERNAME,
        MAIL_PASSWORD=settings.MAIL_PASSWORD,
        MAIL_FROM=settings.MAIL_FROM if settings.MAIL_FROM else "noreply@uba.edu.kz",
        MAIL_PORT=settings.MAIL_PORT,
        MAIL_SERVER=settings.MAIL_SERVER if settings.MAIL_SERVER else "smtp.gmail.com",
        MAIL_STARTTLS=settings.MAIL_STARTTLS,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=bool(settings.MAIL_USERNAME),
        VALIDATE_CERTS=False,
    )

async def send_email(to: str, subject: str, body: str):
    try:
        conf = _get_conf()
        msg = MessageSchema(subject=subject, recipients=[to], body=body, subtype=MessageType.html)
        fm = FastMail(conf)
        await fm.send_message(msg)
    except Exception as e:
        print(f"Email failed to {to}: {e}")  # log, don't crash

async def send_status_change_email(to: str, app_type: str, new_status: str, comment: str | None):
    status_labels = {"approved": "Одобрена", "rejected": "Отклонена", "pending": "На рассмотрении"}
    label = status_labels.get(new_status, new_status)
    comment_block = f"<p><b>Комментарий:</b> {comment}</p>" if comment else ""
    body = f"""
    <p>Уважаемый заявитель,</p>
    <p>Статус вашей заявки (<b>{app_type}</b>) изменён на: <b>{label}</b></p>
    {comment_block}
    <p>С уважением, НАО «Алтынсарина»</p>
    """
    await send_email(to, f"Статус заявки: {label}", body)
