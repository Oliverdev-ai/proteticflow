import pyotp
import qrcode
import base64
from io import BytesIO

class TwoFactorService:
    """
    Serviço central de gestão de 2FA usando o PyOTP.
    """

    @staticmethod
    def generate_secret() -> str:
        """Gera uma nova chave secreta TOTP em Base32."""
        return pyotp.random_base32()

    @staticmethod
    def get_totp_uri(secret: str, username: str, issuer_name: str = "DentalFlow") -> str:
        """Gera a URI de provisionamento que o Authenticator vai ler."""
        return pyotp.totp.TOTP(secret).provisioning_uri(
            name=username,
            issuer_name=issuer_name
        )

    @staticmethod
    def generate_qr_code_base64(uri: str) -> str:
        """Converte a URI em uma imagem QR Code Base64 para envio pro Front."""
        qr = qrcode.make(uri)
        buffered = BytesIO()
        qr.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode('utf-8')

    @staticmethod
    def verify_token(secret: str, token: str) -> bool:
        """Verifica se o código 6-dígitos token informado pelo usuário é válido."""
        if not secret or not token:
            return False
        totp = pyotp.TOTP(secret)
        return totp.verify(token)
