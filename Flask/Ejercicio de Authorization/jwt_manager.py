from datetime import datetime, timedelta, timezone

import jwt


class JWT_Manager:
    def __init__(self, private_key, public_key):
        self.private_key = private_key
        self.public_key = public_key

    def encode(self, data):
        payload = dict(data)
        now = datetime.now(timezone.utc)
        payload["iat"] = now
        payload["exp"] = now + timedelta(minutes=60)
        return jwt.encode(payload, self.private_key, algorithm="RS256")

    def decode(self, token):
        return jwt.decode(token, self.public_key, algorithms=["RS256"])
