from typing import Any

from flask import jsonify
from flask.typing import ResponseReturnValue


def success_response(data: Any = None, status_code: int = 200) -> ResponseReturnValue:
    body = {"data": data or {}}
    return jsonify(body), status_code


def error_response(
    message: str,
    status_code: int = 400,
    details: Any = None,
) -> ResponseReturnValue:
    body = {"error": {"message": message}}
    if details:
        body["error"]["details"] = details
    return jsonify(body), status_code
