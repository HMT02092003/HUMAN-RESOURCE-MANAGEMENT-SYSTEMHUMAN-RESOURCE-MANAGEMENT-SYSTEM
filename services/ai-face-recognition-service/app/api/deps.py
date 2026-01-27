from fastapi import Request, Security, Depends
from fastapi.security import APIKeyHeader
import json
import base64

# Expect Gateway to send x-user-data
api_key_header = APIKeyHeader(name="x-user-data", auto_error=False)

def get_current_user(x_user_data: str = Security(api_key_header)):
    """
    Extract user data from Gateway-injected header.
    Returns dict with user info (id, roleId, etc.) or None.
    """
    if not x_user_data:
        return None
    try:
        decoded_bytes = base64.b64decode(x_user_data)
        decoded_str = decoded_bytes.decode('utf-8')
        user_data = json.loads(decoded_str)
        return user_data
    except Exception:
        return None
