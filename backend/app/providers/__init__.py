import os

from .base import PropertyDataProvider
from .mock import MockProvider


def get_provider() -> PropertyDataProvider:
    name = os.getenv("PROVIDER", "mock").lower()
    # 将来：if name == "rentcast": return RentCastProvider(api_key=os.environ["RENTCAST_KEY"])
    return MockProvider()
