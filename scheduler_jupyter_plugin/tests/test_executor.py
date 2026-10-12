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
import re
import subprocess
import unittest
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import aiohttp
import pytest
from google.cloud import storage
from tornado.httpclient import HTTPClientError

from scheduler_jupyter_plugin import credentials
from scheduler_jupyter_plugin.commons import constants
from scheduler_jupyter_plugin.services import airflow
from scheduler_jupyter_plugin.services import executor
from scheduler_jupyter_plugin.tests import mocks
from scheduler_jupyter_plugin.tests.test_airflow import MockClientSession


async def mock_credentials():
    return {
        "project_id": "credentials-project",
        "project_number": 12345,
        "region_id": "mock-region",
        "access_token": "mock-token",
        "config_error": 0,
        "login_error": 0,
    }


def mock_get(api_endpoint, headers=None):
    response = Mock()
    response.status_code = 200
    response.json.return_value = {
        "api_endpoint": api_endpoint,
        "headers": headers,
    }
    return response


async def mock_config(field_name):
    return None


class TestExecuteMethod(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.instance = executor.Client(
            {
                "access_token": "mock-token",
                "project_id": "credentials-project",
                "region_id": "us-central1",
            },
            MagicMock(),
            MagicMock(),
        )
        self.input_data = {
            "dag_id": "test_dag_id",
            "name": "test_job_name",
            "composer_environment_name": "test_env",
            "input_filename": "test_input_file",
        }

    @patch.object(executor.Client, "upload_to_gcs", new_callable=AsyncMock)
    @patch.object(executor.Client, "prepare_dag", new_callable=AsyncMock)
    @patch.object(executor.Client, "create_payload")
    @patch.object(executor.Client, "check_file_exists", new_callable=AsyncMock)
    @patch.object(executor.Client, "get_bucket", new_callable=AsyncMock)
    async def test_execute_success(
        self,
        mock_get_bucket,
        mock_check_file_exists,
        mock_create_payload,
        mock_prepare_dag,
        mock_upload_to_gcs,
    ):
        mock_get_bucket.return_value = "test_bucket"
        mock_check_file_exists.return_value = True

        result = await self.instance.execute(
            self.input_data, "mock-project-id", "us-central1"
        )

        self.assertEqual(result, {"status": 0})
        mock_get_bucket.assert_awaited_once_with(
            "test_env", "mock-project-id", "us-central1"
        )


@pytest.mark.parametrize("returncode, expected_result", [(0, 0)])
async def test_download_dag_output(monkeypatch, returncode, expected_result, jp_fetch):

    async def mock_list_dag_run_task(*args, **kwargs):
        return None

    monkeypatch.setattr(airflow.Client, "list_dag_run_task", mock_list_dag_run_task)
    monkeypatch.setattr(aiohttp, "ClientSession", MockClientSession)
    mock_blob = MagicMock()
    mock_blob.download_as_bytes.return_value = b"mock file content"

    mock_bucket = MagicMock()
    mock_bucket.blob.return_value = mock_blob

    mock_storage_client = MagicMock()
    mock_storage_client.bucket.return_value = mock_bucket
    monkeypatch.setattr(credentials, "get_cached", mock_credentials)
    monkeypatch.setattr(storage, "Client", lambda credentials=None: mock_storage_client)

    mock_composer_name = "mock-composer"
    mock_bucket_name = "mock_bucket"
    mock_dag_id = "mock-dag-id"
    mock_dag_run_id = "258"
    mock_project_id = "mock-project-id"
    mock_region_id = "mock-region-id"

    response = await jp_fetch(
        "scheduler-plugin",
        "downloadOutput",
        params={
            "composer": mock_composer_name,
            "bucket_name": mock_bucket_name,
            "dag_id": mock_dag_id,
            "dag_run_id": mock_dag_run_id,
            "project_id": mock_project_id,
            "region_id": mock_region_id,
        },
        method="POST",
        allow_nonstandard_methods=True,
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload["status"] == 0


async def test_invalid_composer_name(monkeypatch, jp_fetch):
    mock_composer_name = "mock_composer"
    mock_bucket_name = "mock-bucket"
    mock_dag_id = "mock-dag-id"
    mock_dag_run_id = "258"
    mock_project_id = "mock-project-id"
    mock_region_id = "mock-region-id"
    response = await jp_fetch(
        "scheduler-plugin",
        "downloadOutput",
        params={
            "composer": mock_composer_name,
            "bucket_name": mock_bucket_name,
            "dag_id": mock_dag_id,
            "dag_run_id": mock_dag_run_id,
            "project_id": mock_project_id,
            "region_id": mock_region_id,
        },
        method="POST",
        allow_nonstandard_methods=True,
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert "status" not in payload
    assert "error" in payload
    assert "Invalid Composer environment name" in payload["error"]


async def test_invalid_bucket_name(monkeypatch, jp_fetch):
    mock_composer_name = "mock-composer"
    mock_bucket_name = "mock/bucket"
    mock_dag_id = "mock-dag-id"
    mock_dag_run_id = "258"
    mock_project_id = "mock-project-id"
    mock_region_id = "mock-region-id"
    response = await jp_fetch(
        "scheduler-plugin",
        "downloadOutput",
        params={
            "composer": mock_composer_name,
            "bucket_name": mock_bucket_name,
            "dag_id": mock_dag_id,
            "dag_run_id": mock_dag_run_id,
            "project_id": mock_project_id,
            "region_id": mock_region_id,
        },
        method="POST",
        allow_nonstandard_methods=True,
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert "status" not in payload
    assert "error" in payload
    assert "Invalid bucket name" in payload["error"]


async def test_invalid_dag_id(monkeypatch, jp_fetch):
    mock_composer_name = "mock-composer"
    mock_bucket_name = "mock-bucket"
    mock_dag_id = "mock/dag/id"
    mock_dag_run_id = "258"
    mock_project_id = "mock-project-id"
    mock_region_id = "mock-region-id"
    response = await jp_fetch(
        "scheduler-plugin",
        "downloadOutput",
        params={
            "composer": mock_composer_name,
            "bucket_name": mock_bucket_name,
            "dag_id": mock_dag_id,
            "dag_run_id": mock_dag_run_id,
            "project_id": mock_project_id,
            "region_id": mock_region_id,
        },
        method="POST",
        allow_nonstandard_methods=True,
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert "status" not in payload
    assert "error" in payload
    assert "Invalid DAG ID" in payload["error"]


async def test_invalid_dag_run_id(monkeypatch, jp_fetch):
    mock_composer_name = "mock-composer"
    mock_bucket_name = "mock-bucket"
    mock_dag_id = "mock-dag-id"
    mock_dag_run_id = "a/b/c/d"
    mock_project_id = "mock-project-id"
    mock_region_id = "mock-region-id"
    response = await jp_fetch(
        "scheduler-plugin",
        "downloadOutput",
        params={
            "composer": mock_composer_name,
            "bucket_name": mock_bucket_name,
            "dag_id": mock_dag_id,
            "dag_run_id": mock_dag_run_id,
            "project_id": mock_project_id,
            "region_id": mock_region_id,
        },
        method="POST",
        allow_nonstandard_methods=True,
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert "status" not in payload
    assert "error" in payload
    assert "Invalid DAG Run ID" in payload["error"]


INVALID_ENVIRONMENT_NAMES = ["my env", "--my-env", "my-env;x", "My-Env", ""]
INVALID_REGION_IDS = ["us central1", "--region=x", "us-central1;x", "US-CENTRAL1", ""]
INVALID_PROJECT_IDS = ["my project", "-my-project", "my-project;x", "My-Project", ""]


# Header lines are skipped, then the first column is the package name.
LIST_PACKAGES_OUTPUT = """\
PACKAGE                             VERSION
----------------------------------  -------
apache-airflow-providers-papermill  3.6.0
pandas                              2.1.4
"""


def _mock_gcloud(monkeypatch, output=""):
    mocks.patch_mocks(monkeypatch)
    run_gcloud = AsyncMock(return_value=output)
    monkeypatch.setattr(executor, "async_run_gcloud_subcommand", run_gcloud)
    return run_gcloud


async def test_check_required_packages_rejects_get(monkeypatch, jp_fetch):
    run_gcloud = _mock_gcloud(monkeypatch)

    with pytest.raises(HTTPClientError) as error:
        await jp_fetch(
            "scheduler-plugin",
            "checkRequiredPackages",
            params={"composer_environment_name": "my-env", "region_id": "us-central1"},
        )

    assert error.value.code == 405
    run_gcloud.assert_not_awaited()


async def test_check_required_packages_lists_missing_packages(monkeypatch, jp_fetch):
    run_gcloud = _mock_gcloud(monkeypatch, LIST_PACKAGES_OUTPUT)

    response = await jp_fetch(
        "scheduler-plugin",
        "checkRequiredPackages",
        params={"composer_environment_name": "my-env", "region_id": "us-central1"},
        method="POST",
        allow_nonstandard_methods=True,
    )

    assert response.code == 200
    assert json.loads(response.body) == ["ipykernel"]
    run_gcloud.assert_awaited_once_with(
        "beta composer environments list-packages my-env --location us-central1"
    )


@pytest.mark.parametrize(
    "params, error",
    [
        (
            {"composer_environment_name": name, "region_id": "us-central1"},
            f"Invalid environment name: {name}",
        )
        for name in INVALID_ENVIRONMENT_NAMES
    ]
    + [
        (
            {"composer_environment_name": "my-env", "region_id": region},
            f"Invalid region: {region}",
        )
        for region in INVALID_REGION_IDS
    ],
)
async def test_check_required_packages_rejects_invalid_input(
    monkeypatch, params, error, jp_fetch
):
    run_gcloud = _mock_gcloud(monkeypatch, LIST_PACKAGES_OUTPUT)

    response = await jp_fetch(
        "scheduler-plugin",
        "checkRequiredPackages",
        params=params,
        method="POST",
        allow_nonstandard_methods=True,
    )

    assert response.code == 200
    assert json.loads(response.body) == {"error": error}
    run_gcloud.assert_not_awaited()


def _job_payload(**fields):
    payload = {
        "input_filename": "notebook.ipynb",
        "composer_environment_name": "my-env",
        "name": "my_job",
        "dag_id": "my-dag-id",
        "local_kernel": True,
    }
    payload.update(fields)
    return payload


def _mock_execute(monkeypatch):
    mocks.patch_mocks(monkeypatch)
    execute = AsyncMock(return_value={"status": 0})
    monkeypatch.setattr(executor.Client, "execute", execute)
    return execute


async def _create_job_scheduler(
    jp_fetch, payload, project_id="my-project", region_id="us-central1"
):
    return await jp_fetch(
        "scheduler-plugin",
        "createJobScheduler",
        params={"project_id": project_id, "region_id": region_id},
        method="POST",
        body=json.dumps(payload),
    )


@pytest.mark.parametrize(
    "fields",
    [
        {},
        {"packages_to_install": []},
        {"packages_to_install": ["ipykernel"]},
        {
            "packages_to_install": [
                "apache-airflow-providers-papermill",
                "ipykernel",
            ]
        },
    ],
)
async def test_create_job_scheduler_accepts_valid_input(monkeypatch, fields, jp_fetch):
    execute = _mock_execute(monkeypatch)
    payload = _job_payload(**fields)

    response = await _create_job_scheduler(jp_fetch, payload)

    assert response.code == 200
    assert json.loads(response.body) == {"status": 0}
    execute.assert_awaited_once_with(payload, "my-project", "us-central1")


@pytest.mark.parametrize("region_id", INVALID_REGION_IDS)
async def test_create_job_scheduler_rejects_invalid_region(
    monkeypatch, region_id, jp_fetch
):
    execute = _mock_execute(monkeypatch)

    response = await _create_job_scheduler(
        jp_fetch, _job_payload(), region_id=region_id
    )

    assert response.code == 200
    assert json.loads(response.body) == {"error": f"Invalid region: {region_id}"}
    execute.assert_not_awaited()


@pytest.mark.parametrize("project_id", INVALID_PROJECT_IDS)
async def test_create_job_scheduler_rejects_invalid_project_id(
    monkeypatch, project_id, jp_fetch
):
    execute = _mock_execute(monkeypatch)

    response = await _create_job_scheduler(
        jp_fetch, _job_payload(), project_id=project_id
    )

    assert response.code == 200
    assert json.loads(response.body) == {"error": f"Invalid project ID: {project_id}"}
    execute.assert_not_awaited()


@pytest.mark.parametrize(
    "packages_to_install",
    [["pandas"], ["ipykernel", "pandas"], ["ipykernel==6.0.0"], "ipykernel"],
)
async def test_create_job_scheduler_rejects_packages_outside_allowlist(
    monkeypatch, packages_to_install, jp_fetch
):
    execute = _mock_execute(monkeypatch)

    response = await _create_job_scheduler(
        jp_fetch, _job_payload(packages_to_install=packages_to_install)
    )

    assert response.code == 200
    assert json.loads(response.body) == {
        "error": f"Invalid packages_to_install: {packages_to_install}"
    }
    execute.assert_not_awaited()


@pytest.mark.parametrize(
    "project_id",
    ["my-project", "abc123", "a" + "b" * 28 + "c", "example.com:my-project"],
)
def test_project_id_regexp_accepts_valid_ids(project_id):
    assert re.fullmatch(constants.PROJECT_ID_REGEXP, project_id)


@pytest.mark.parametrize(
    "project_id",
    INVALID_PROJECT_IDS
    + [
        "abc12",
        "a" + "b" * 29 + "c",
        "1project",
        "my-project-",
        "example.com:-my-project",
    ],
)
def test_project_id_regexp_rejects_invalid_ids(project_id):
    assert not re.fullmatch(constants.PROJECT_ID_REGEXP, project_id)
