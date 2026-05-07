from fastapi import Request
from fastapi.responses import JSONResponse
from backend.core.responses.responses import error_response
from backend.core.logging.logger import log

class BusinessException(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code

async def global_exception_handler(request: Request, exc: Exception):
    log.error("Unhandled exception", exc_info=exc, path=request.url.path)
    return JSONResponse(
        status_code=500,
        content=error_response(message="Erro interno no servidor").model_dump()
    )

async def business_exception_handler(request: Request, exc: BusinessException):
    log.warning("Business exception", message=exc.message, path=request.url.path)
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(message=exc.message).model_dump()
    )
