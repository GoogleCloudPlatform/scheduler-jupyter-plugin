# Copyright 2025 Google LLC
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

import pytest
from tornado.httpclient import HTTPClientError


async def test_get_default_settings(jp_fetch):
    response = await jp_fetch("scheduler-plugin", "settings")
    assert response.code == 200
    payload = json.loads(response.body)
    assert "log_path" in payload
    assert payload["log_path"] is ""


async def test_configuration_route_is_not_registered(jp_fetch):
    with pytest.raises(HTTPClientError) as error:
        await jp_fetch(
            "scheduler-plugin",
            "configuration",
            method="POST",
            body=json.dumps({"projectId": "my-project", "region": "us-central1"}),
        )
    assert error.value.code == 404
