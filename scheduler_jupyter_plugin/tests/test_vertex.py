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
import unittest
from unittest.mock import ANY, AsyncMock, MagicMock, patch
import aiohttp

import pytest

from scheduler_jupyter_plugin.models.models import (
    DescribeUpdateVertexJob,
    DescribeVertexJob,
)
from scheduler_jupyter_plugin.services import vertex
from scheduler_jupyter_plugin.tests.mocks import (
    MockClientSession,
    MockResponse,
    MockDeleteSchedulesClientSession,
    MockGetScheduleClientSession,
    MockListNotebookExecutionJobsClientSession,
    MockListSchedulesClientSession,
    MockListUIConfigClientSession,
    MockPostClientSession,
    MockTriggerSchedulesClientSession,
)


@pytest.mark.parametrize(
    "returncode, expected_result",
    [(0, {"createNotebookExecutionJobRequest": {"notebookExecutionJob": {}}})],
)
async def test_get_schedule(monkeypatch, returncode, expected_result, jp_fetch):
    monkeypatch.setattr(aiohttp, "ClientSession", MockGetScheduleClientSession)

    mock_region_id = "us-central1"
    mock_schedule_id = "mock-project-id"

    response = await jp_fetch(
        "scheduler-plugin",
        "api/vertex/getSchedule",
        params={"region_id": mock_region_id, "schedule_id": mock_schedule_id},
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == expected_result


@pytest.mark.parametrize("returncode, expected_result", [(0, {})])
async def test_resume_schedule(monkeypatch, returncode, expected_result, jp_fetch):
    monkeypatch.setattr(aiohttp, "ClientSession", MockPostClientSession)

    mock_region_id = "us-central1"
    mock_schedule_id = "mock-project-id"

    response = await jp_fetch(
        "scheduler-plugin",
        "api/vertex/resumeSchedule",
        method="POST",
        allow_nonstandard_methods=True,
        params={"region_id": mock_region_id, "schedule_id": mock_schedule_id},
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == expected_result


@pytest.mark.parametrize("returncode, expected_result", [(0, {})])
async def test_pause_schedule(monkeypatch, returncode, expected_result, jp_fetch):
    monkeypatch.setattr(aiohttp, "ClientSession", MockPostClientSession)

    mock_region_id = "us-central1"
    mock_schedule_id = "mock-project-id"

    response = await jp_fetch(
        "scheduler-plugin",
        "api/vertex/pauseSchedule",
        method="POST",
        allow_nonstandard_methods=True,
        params={"region_id": mock_region_id, "schedule_id": mock_schedule_id},
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == expected_result


@pytest.mark.parametrize(
    "returncode, expected_result", [(0, {"name": "mock-name", "done": True})]
)
async def test_delete_schedule(monkeypatch, returncode, expected_result, jp_fetch):
    monkeypatch.setattr(aiohttp, "ClientSession", MockDeleteSchedulesClientSession)

    mock_region_id = "us-central1"
    mock_schedule_id = "mock-project-id"

    response = await jp_fetch(
        "scheduler-plugin",
        "api/vertex/deleteSchedule",
        method="DELETE",
        params={"region_id": mock_region_id, "schedule_id": mock_schedule_id},
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == expected_result


@pytest.mark.parametrize(
    "returncode, expected_result",
    [
        (
            0,
            [
                {
                    "machineType": "value1 (2 CPUs, 206.16 GB RAM)",
                    "acceleratorConfigs": [],
                },
                {
                    "machineType": "value12 (1 CPUs, 1005.02 GB RAM)",
                    "acceleratorConfigs": [],
                },
            ],
        )
    ],
)
async def test_list_uiconfig(monkeypatch, returncode, expected_result, jp_fetch):
    monkeypatch.setattr(aiohttp, "ClientSession", MockListUIConfigClientSession)

    mock_region_id = "us-central1"

    response = await jp_fetch(
        "scheduler-plugin",
        "api/vertex/uiConfig",
        params={"region_id": mock_region_id},
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == expected_result


@pytest.mark.parametrize(
    "returncode, expected_result",
    [
        (
            0,
            [{"name": "mock-name"}, {"name": "mock-name1"}],
        )
    ],
)
async def test_list_notebook_execution_jobs(
    monkeypatch, returncode, expected_result, jp_fetch
):
    monkeypatch.setattr(
        aiohttp, "ClientSession", MockListNotebookExecutionJobsClientSession
    )

    mock_region_id = "us-central1"
    mock_schedule_id = "mock-project-id"
    mock_order_by = "mock-order-by"

    response = await jp_fetch(
        "scheduler-plugin",
        "api/vertex/listNotebookExecutionJobs",
        params={
            "region_id": mock_region_id,
            "schedule_id": mock_schedule_id,
            "order_by": mock_order_by,
        },
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == expected_result


@pytest.mark.parametrize(
    "returncode, expected_result",
    [
        (
            0,
            {
                "schedules": [
                    {
                        "createTime": None,
                        "displayName": None,
                        "lastScheduledRunResponse": None,
                        "name": None,
                        "nextRunTime": None,
                        "schedule": "Every 5 minutes",
                        "status": None,
                    },
                ],
            },
        )
    ],
)
async def test_list_schedules(monkeypatch, returncode, expected_result, jp_fetch):
    def mock_get_description(*args, **kwargs):
        return "Every 5 minutes"

    monkeypatch.setattr(vertex.Client, "parse_schedule", mock_get_description)
    monkeypatch.setattr(aiohttp, "ClientSession", MockListSchedulesClientSession)

    mock_region_id = "us-central1"
    mock_page_size = "mock-page-size"

    response = await jp_fetch(
        "scheduler-plugin",
        "api/vertex/listSchedules",
        params={"region_id": mock_region_id, "page_size": mock_page_size},
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == expected_result


@pytest.mark.parametrize("returncode, expected_result", [(0, {"name": "mock-name"})])
async def test_trigger_schedule(monkeypatch, returncode, expected_result, jp_fetch):
    async def mock_get_schedule(*args, **kwargs):
        return {"createNotebookExecutionJobRequest": {"notebookExecutionJob": {}}}

    monkeypatch.setattr(vertex.Client, "get_schedule", mock_get_schedule)

    monkeypatch.setattr(aiohttp, "ClientSession", MockTriggerSchedulesClientSession)

    mock_region_id = "us-central1"
    mock_schedule_id = "mock-project-id"

    response = await jp_fetch(
        "scheduler-plugin",
        "api/vertex/triggerSchedule",
        method="POST",
        allow_nonstandard_methods=True,
        params={"region_id": mock_region_id, "schedule_id": mock_schedule_id},
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == expected_result


class TestCreateJobScheduleMethod(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.instance = _make_client()
        self.input_data = {
            "cloud_storage_bucket": "test_cloud_storage_bucket",
            "display_name": "test_display_name",
            "input_filename": "test_input_file",
        }

    @patch.object(vertex.Client, "create_schedule", new_callable=AsyncMock)
    @patch.object(vertex.Client, "upload_to_gcs", new_callable=AsyncMock)
    async def test_create_job_schedule(
        self,
        mock_upload_to_gcs,
        mock_create_schedule,
    ):
        mock_upload_to_gcs.return_value = "test_display_name/test_input_file"
        mock_create_schedule.return_value = {}

        result = await self.instance.create_job_schedule(self.input_data)

        self.assertEqual(result, {})
        mock_upload_to_gcs.assert_awaited_once_with(
            "test_cloud_storage_bucket", "test_input_file", "test_display_name"
        )
        mock_create_schedule.assert_awaited_once_with(
            ANY, "test_display_name/test_input_file", "test_cloud_storage_bucket"
        )


class TestCreateNewBucketMethod(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.instance = _make_client()
        self.input_data = {
            "bucket_name": "test_bucket_name",
        }

    @patch.object(vertex.Client, "create_gcs_bucket", new_callable=AsyncMock)
    async def test_create_new_bucket(self, mock_create_gcs_bucket):
        mock_create_gcs_bucket.return_value = None

        result = await self.instance.create_new_bucket(self.input_data)

        self.assertIsNone(result)
        mock_create_gcs_bucket.assert_awaited_once_with("test_bucket_name")


def _make_client():
    return vertex.Client(
        {
            "access_token": "mock-token",
            "project_id": "mock-project",
            "region_id": "mock-region",
        },
        MagicMock(),
        MagicMock(),
    )


class TestBuildWorkbenchRuntime(unittest.TestCase):
    def setUp(self):
        self.client = _make_client()

    def test_default_image_returns_empty(self):
        self.assertEqual(
            self.client._build_workbench_runtime(DescribeVertexJob()), {}
        )

    def test_vm_image_with_family(self):
        job = DescribeVertexJob(vm_image_project="proj", vm_image_family="fam")
        self.assertEqual(
            self.client._build_workbench_runtime(job),
            {"vmImage": {"project": "proj", "family": "fam"}},
        )

    def test_custom_container_with_tag(self):
        job = DescribeVertexJob(
            custom_container_repository="gcr.io/p/i",
            custom_container_tag="v1",
        )
        self.assertEqual(
            self.client._build_workbench_runtime(job),
            {"customContainerImage": {"repository": "gcr.io/p/i", "tag": "v1"}},
        )

    def test_custom_container_without_tag(self):
        job = DescribeVertexJob(custom_container_repository="gcr.io/p/i")
        self.assertEqual(
            self.client._build_workbench_runtime(job),
            {"customContainerImage": {"repository": "gcr.io/p/i"}},
        )


class TestBuildShieldedInstanceConfig(unittest.TestCase):
    def setUp(self):
        self.client = _make_client()

    def test_all_disabled_returns_none(self):
        self.assertIsNone(
            self.client._build_shielded_instance_config(DescribeVertexJob())
        )

    def test_secure_boot_only(self):
        job = DescribeVertexJob(enable_secure_boot=True)
        self.assertEqual(
            self.client._build_shielded_instance_config(job),
            {
                "enableSecureBoot": True,
                "enableVtpm": False,
                "enableIntegrityMonitoring": False,
            },
        )

    def test_all_enabled(self):
        job = DescribeVertexJob(
            enable_secure_boot=True,
            enable_vtpm=True,
            enable_integrity_monitoring=True,
        )
        self.assertEqual(
            self.client._build_shielded_instance_config(job),
            {
                "enableSecureBoot": True,
                "enableVtpm": True,
                "enableIntegrityMonitoring": True,
            },
        )

    def test_supports_update_model(self):
        data = DescribeUpdateVertexJob(enable_vtpm=True)
        self.assertEqual(
            self.client._build_shielded_instance_config(data),
            {
                "enableSecureBoot": False,
                "enableVtpm": True,
                "enableIntegrityMonitoring": False,
            },
        )


class TestApplyExecutionIdentity(unittest.TestCase):
    """service_account and execution_user are a oneof, so only one is sent."""

    def setUp(self):
        self.client = _make_client()

    def _apply(self, job):
        notebook_execution_job = {}
        self.client._apply_execution_identity(notebook_execution_job, job)
        return notebook_execution_job

    def test_service_account_only(self):
        job = DescribeVertexJob(service_account="sa@project.iam.gserviceaccount.com")
        self.assertEqual(
            self._apply(job),
            {"serviceAccount": "sa@project.iam.gserviceaccount.com"},
        )

    def test_execution_user_only(self):
        job = DescribeVertexJob(execution_user="user@example.com")
        self.assertEqual(self._apply(job), {"executionUser": "user@example.com"})

    def test_both_set_sends_only_execution_user(self):
        # Sending both arms of the oneof would let the service decide which
        # identity the notebook runs as, so the chosen one must win outright.
        job = DescribeVertexJob(
            service_account="sa@project.iam.gserviceaccount.com",
            execution_user="user@example.com",
        )
        self.assertEqual(self._apply(job), {"executionUser": "user@example.com"})

    def test_neither_set_sends_nothing(self):
        self.assertEqual(self._apply(DescribeVertexJob()), {})

    def test_supports_update_model(self):
        data = DescribeUpdateVertexJob(execution_user="user@example.com")
        self.assertEqual(self._apply(data), {"executionUser": "user@example.com"})


def _payload_client():
    return vertex.Client(
        {
            "access_token": "mock-token",
            "project_id": "mock-project",
            "region_id": "us-central1",
        },
        MagicMock(),
        MockClientSession(),
    )


def _base_job(**overrides):
    fields = {
        "display_name": "test-job",
        "machine_type": "n1-standard-2 (2 CPUs, 8 GB RAM)",
        "kernel_name": "python3",
        "schedule_value": "* * * * *",
        "time_zone": "UTC",
        "region": "us-central1",
        "cloud_storage_bucket": "gs://bucket",
        "parameters": [],
        "disk_type": "pd-standard (Standard Persistent Disk)",
        "disk_size": "100",
    }
    fields.update(overrides)
    return DescribeVertexJob(**fields)


async def _created_execution_job(job):
    client = _payload_client()
    result = await client.create_schedule(job, "gs://bucket/n.ipynb", "bucket")
    return result["results"][0]["json"]["createNotebookExecutionJobRequest"][
        "notebookExecutionJob"
    ]


async def test_create_schedule_sends_execution_user_for_euc():
    notebook_execution_job = await _created_execution_job(
        _base_job(execution_user="user@example.com")
    )

    assert notebook_execution_job["executionUser"] == "user@example.com"
    assert "serviceAccount" not in notebook_execution_job
    # EUC only activates when the job carries a kernel name; without it the job
    # succeeds while silently running as the service agent instead of the user.
    assert notebook_execution_job["kernelName"] == "python3"


async def test_create_schedule_sends_service_account_by_default():
    notebook_execution_job = await _created_execution_job(
        _base_job(service_account="sa@project.iam.gserviceaccount.com")
    )

    assert (
        notebook_execution_job["serviceAccount"]
        == "sa@project.iam.gserviceaccount.com"
    )
    assert "executionUser" not in notebook_execution_job


async def test_create_schedule_omits_notebook_execution_job_id():
    # A client-supplied non-numeric id makes the on-VM token exchange reject the
    # resource name, leaving an EUC job stuck in PENDING with no error surfaced.
    notebook_execution_job = await _created_execution_job(
        _base_job(execution_user="user@example.com")
    )

    assert "notebookExecutionJobId" not in notebook_execution_job


class _PatchCapturingSession:
    """Captures the body of the PATCH that update_schedule sends."""

    def __init__(self):
        self.json_body = None

    def patch(self, api_endpoint, headers=None, json=None):
        self.json_body = json
        return MockResponse({})


async def test_update_schedule_always_sends_kernel_name():
    session = _PatchCapturingSession()
    client = vertex.Client(
        {
            "access_token": "mock-token",
            "project_id": "mock-project",
            "region_id": "us-central1",
        },
        MagicMock(),
        session,
    )

    await client.update_schedule(
        "us-central1",
        "projects/p/locations/us-central1/schedules/1",
        {
            "display_name": "test-job",
            "kernel_name": "python3",
            "schedule_value": "* * * * *",
            "time_zone": "UTC",
            "parameters": [],
            "execution_user": "user@example.com",
            "gcs_notebook_source": "gs://bucket/n.ipynb",
        },
    )

    notebook_execution_job = session.json_body["createNotebookExecutionJobRequest"][
        "notebookExecutionJob"
    ]
    # Unconditional: an edit that drops the kernel name turns an EUC schedule
    # back into one that silently runs as the service agent.
    assert notebook_execution_job["kernelName"] == "python3"
    assert notebook_execution_job["executionUser"] == "user@example.com"
    assert "serviceAccount" not in notebook_execution_job


MALICIOUS_REGION_IDS = [
    "attacker.com/",
    "169.254.169.254/",
    "us-central1/",
    "us-central1/../../evil",
    "us-central1@evil.com",
    "us-central1.evil.com",
    "us-central1#frag",
    "us-central1?a=b",
    "US-CENTRAL1",
    "localhost",
    "",
]


class TestValidateRegionId(unittest.TestCase):
    def test_valid_regions_pass(self):
        for region in [
            "us-central1",
            "us-east4",
            "us-west1",
            "europe-west4",
            "europe-west12",
            "asia-northeast1",
            "northamerica-northeast2",
            "southamerica-east1",
            "australia-southeast1",
            "me-central1",
            "africa-south1",
        ]:
            self.assertEqual(vertex.Client._validate_region_id(region), region)

    def test_malicious_or_malformed_regions_raise(self):
        for region in MALICIOUS_REGION_IDS + [None, "us_central1", "uscentral1"]:
            with self.assertRaises(ValueError):
                vertex.Client._validate_region_id(region)


def _spy_client():
    client = vertex.Client(
        {
            "access_token": "mock-token",
            "project_id": "mock-project",
            "region_id": "us-central1",
        },
        MagicMock(),
        MagicMock(),
    )
    return client, client.client_session


def _assert_no_outbound_request(session):
    session.get.assert_not_called()
    session.post.assert_not_called()
    session.delete.assert_not_called()
    session.patch.assert_not_called()


@pytest.mark.parametrize("region", MALICIOUS_REGION_IDS)
async def test_list_schedules_rejects_ssrf_region(region):
    client, session = _spy_client()
    result = await client.list_schedules(region, "10")
    assert "Invalid region ID" in str(result)
    _assert_no_outbound_request(session)


@pytest.mark.parametrize("region", MALICIOUS_REGION_IDS)
async def test_list_uiconfig_rejects_ssrf_region(region):
    client, session = _spy_client()
    result = await client.list_uiconfig(region)
    assert "Invalid region ID" in str(result)
    _assert_no_outbound_request(session)


@pytest.mark.parametrize("region", MALICIOUS_REGION_IDS)
async def test_get_schedule_rejects_ssrf_region(region):
    client, session = _spy_client()
    result = await client.get_schedule(region, "sched-1")
    assert "Invalid region ID" in str(result)
    _assert_no_outbound_request(session)


@pytest.mark.parametrize("region", MALICIOUS_REGION_IDS)
async def test_pause_schedule_rejects_ssrf_region(region):
    client, session = _spy_client()
    result = await client.pause_schedule(region, "sched-1")
    assert "Invalid region ID" in str(result)
    _assert_no_outbound_request(session)


@pytest.mark.parametrize("region", MALICIOUS_REGION_IDS)
async def test_resume_schedule_rejects_ssrf_region(region):
    client, session = _spy_client()
    result = await client.resume_schedule(region, "sched-1")
    assert "Invalid region ID" in str(result)
    _assert_no_outbound_request(session)


@pytest.mark.parametrize("region", MALICIOUS_REGION_IDS)
async def test_delete_schedule_rejects_ssrf_region(region):
    client, session = _spy_client()
    result = await client.delete_schedule(region, "sched-1")
    assert "Invalid region ID" in str(result)
    _assert_no_outbound_request(session)


@pytest.mark.parametrize("region", MALICIOUS_REGION_IDS)
async def test_trigger_schedule_rejects_ssrf_region(region):
    client, session = _spy_client()
    result = await client.trigger_schedule(region, "sched-1")
    assert "Invalid region ID" in str(result)
    _assert_no_outbound_request(session)


@pytest.mark.parametrize("region", MALICIOUS_REGION_IDS)
async def test_update_schedule_rejects_ssrf_region(region):
    client, session = _spy_client()
    result = await client.update_schedule(region, "sched-1", {})
    assert "Invalid region ID" in str(result)
    _assert_no_outbound_request(session)


@pytest.mark.parametrize("region", MALICIOUS_REGION_IDS)
async def test_list_notebook_execution_jobs_rejects_ssrf_region(region):
    client, session = _spy_client()
    result = await client.list_notebook_execution_jobs(region, "sched-1", "createTime")
    assert "Invalid region ID" in str(result)
    _assert_no_outbound_request(session)


@pytest.mark.parametrize("region", MALICIOUS_REGION_IDS)
async def test_create_schedule_rejects_ssrf_region(region):
    client, session = _spy_client()
    job = DescribeVertexJob(region=region)
    with pytest.raises(Exception):
        await client.create_schedule(job, "gs://bucket/in.ipynb", "bucket")
    _assert_no_outbound_request(session)
