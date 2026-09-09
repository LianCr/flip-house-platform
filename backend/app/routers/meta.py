from fastapi import APIRouter

from ..dictionaries import meta

router = APIRouter(prefix="/api/meta", tags=["meta"])


@router.get("")
def get_meta():
    return meta()
