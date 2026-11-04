# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import json
import sys
from unittest.mock import AsyncMock

import aiohttp
import pytest

from scheduler_jupyter_plugin.services import version
from scheduler_jupyter_plugin.tests import mocks


OTHER_PACKAGE_NAMES = [
    "other-package",
    "scheduler-jupyter-plugin==0.1.0",
    "scheduler-jupyter-plugin --pre",
]


class MockPyPIResponse(mocks.MockResponse):
    def raise_for_status(self):
        pass


def _mock_pypi(monkeypatch):
    requested_urls = []

    class MockPyPIClientSession(mocks.MockClientSession):
        def get(self, api_endpoint, headers=None, timeout=None):
            requested_urls.append(api_endpoint)
            return MockPyPIResponse({"info": {"version": "1.2.3"}})

    mocks.patch_mocks(monkeypatch)
    monkeypatch.setattr(aiohttp, "ClientSession", MockPyPIClientSession)
    return requested_urls


def _mock_pip(monkeypatch):
    mocks.patch_mocks(monkeypatch)
    run_command = AsyncMock(return_value="")
    monkeypatch.setattr(version, "async_run_system_command", run_command)
    return run_command


async def test_latest_version_queries_plugin_package(monkeypatch, jp_fetch):
    requested_urls = _mock_pypi(monkeypatch)

    response = await jp_fetch(
        "scheduler-plugin",
        "jupyterlabVersion",
        params={"packageName": "scheduler-jupyter-plugin"},
    )

    assert response.code == 200
    assert json.loads(response.body) == "1.2.3"
    assert requested_urls == ["https://pypi.org/pypi/scheduler-jupyter-plugin/json"]


@pytest.mark.parametrize("package_name", OTHER_PACKAGE_NAMES)
async def test_latest_version_rejects_other_packages(
    monkeypatch, package_name, jp_fetch
):
    requested_urls = _mock_pypi(monkeypatch)

    response = await jp_fetch(
        "scheduler-plugin",
        "jupyterlabVersion",
        params={"packageName": package_name},
    )

    assert response.code == 200
    assert json.loads(response.body) == {
        "error": f"Unsupported package: {package_name}"
    }
    assert requested_urls == []


async def test_update_plugin_installs_plugin_package(monkeypatch, jp_fetch):
    run_command = _mock_pip(monkeypatch)

    response = await jp_fetch(
        "scheduler-plugin",
        "updatePlugin",
        params={"packageName": "scheduler-jupyter-plugin"},
        method="POST",
        allow_nonstandard_methods=True,
    )

    assert response.code == 200
    assert json.loads(response.body) == {"status": "ok"}
    run_command.assert_awaited_once_with(
        [sys.executable, "-m", "pip", "install", "--upgrade", "scheduler-jupyter-plugin"]
    )


@pytest.mark.parametrize("package_name", OTHER_PACKAGE_NAMES)
async def test_update_plugin_rejects_other_packages(
    monkeypatch, package_name, jp_fetch
):
    run_command = _mock_pip(monkeypatch)

    response = await jp_fetch(
        "scheduler-plugin",
        "updatePlugin",
        params={"packageName": package_name},
        method="POST",
        allow_nonstandard_methods=True,
    )

    assert response.code == 200
    assert json.loads(response.body) == {
        "error": f"Unsupported package: {package_name}"
    }
    run_command.assert_not_awaited()
