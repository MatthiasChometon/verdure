"""Load the worker and the api as modules: both are scripts named `app.py`."""

import importlib.util
import pathlib

import pytest

AI = pathlib.Path(__file__).resolve().parent.parent


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, AI / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def worker():
    return load("verdure_worker", "worker/app.py")


@pytest.fixture
def api():
    return load("verdure_api", "api/app.py")
