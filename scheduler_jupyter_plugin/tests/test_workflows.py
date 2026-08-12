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

import asyncio
import json
import os
import subprocess
import sys
from unittest.mock import MagicMock, patch

import pytest

from scheduler_jupyter_plugin import credentials, urls
from scheduler_jupyter_plugin.services import workflow as workflow_service
from scheduler_jupyter_plugin.tests import mocks

async def test_check_api_status_controller_success(monkeypatch, jp_fetch):
    mocks.patch_mocks(monkeypatch)
    mock_results = [{"service_name": "composer", "service_url": "https://composer.googleapis.com/", "is_enabled": True}]
    
    async def mock_check(self):
        return mock_results
    
    monkeypatch.setattr(workflow_service.Client, "check_api_status", mock_check)
    res = await jp_fetch("scheduler-plugin", "api/workflow-orchestration/api-enable-check", method="GET")
    assert res.code == 200
    assert json.loads(res.body) == {"success": True, "results": mock_results}


async def test_check_api_status_controller_exception(monkeypatch, jp_fetch):
    mocks.patch_mocks(monkeypatch)
    
    async def mock_err(self):
        raise RuntimeError("API check failed")
    
    monkeypatch.setattr(workflow_service.Client, "check_api_status", mock_err)
    res = await jp_fetch("scheduler-plugin", "api/workflow-orchestration/api-enable-check", method="GET", raise_error=False)
    assert res.code == 500
    assert json.loads(res.body)["success"] is False
    assert "API check failed" in json.loads(res.body)["error"]


async def test_load_workflow_files_controller_success(monkeypatch, jp_fetch):
    mocks.patch_mocks(monkeypatch)
    mock_ret = {"success": True, "status_code": 200, "hasWorkflowConfig": True, "workflow_files": []}
    
    monkeypatch.setattr(workflow_service.Client, "load_workflow_files", lambda self: mock_ret)
    res = await jp_fetch("scheduler-plugin", "api/workflow-orchestration/load-workflow-files", method="GET")
    assert res.code == 200
    assert json.loads(res.body) == mock_ret


async def test_load_workflow_files_controller_exception(monkeypatch, jp_fetch):
    mocks.patch_mocks(monkeypatch)
    
    def mock_err(self):
        raise RuntimeError("Load failed")
    
    monkeypatch.setattr(workflow_service.Client, "load_workflow_files", mock_err)
    res = await jp_fetch("scheduler-plugin", "api/workflow-orchestration/load-workflow-files", method="GET", raise_error=False)
    assert res.code == 500
    assert json.loads(res.body)["success"] is False


@pytest.mark.parametrize(
    "body, mock_res, exp_code, exp_success",
    [
        ("", None, 400, False),  # Missing body
        (json.dumps({"artifactsBucket": "bkt"}), None, 400, False),  # Pydantic validation error
        (
            json.dumps({
                "artifactsBucket": "bkt", "environmentId": "e1", "gcpProjectId": "p1",
                "pipelineId": "pipe", "region": "us-central1", "schedulerService": "composer", "path": os.getcwd()
            }),
            {"success": True, "status_code": 200, "message": "OK"},
            200,
            True,
        ),  # Success with status code 200
        (
            json.dumps({
                "artifactsBucket": "bkt", "environmentId": "e1", "gcpProjectId": "p1",
                "pipelineId": "pipe", "region": "us-central1", "schedulerService": "composer", "path": os.getcwd()
            }),
            {"success": False, "status_code": 400, "error": "Bad request"},
            400,
            False,
        ),  # Custom status code error 400
        (
            json.dumps({
                "artifactsBucket": "bkt", "environmentId": "e1", "gcpProjectId": "p1",
                "pipelineId": "pipe", "region": "us-central1", "schedulerService": "composer", "path": os.getcwd()
            }),
            {"success": True, "message": "OK without status_code key"},
            200,
            True,
        ),  # Success result without status_code key
    ],
)
async def test_initialize_pipeline_controller(monkeypatch, jp_fetch, body, mock_res, exp_code, exp_success):
    mocks.patch_mocks(monkeypatch)
    if mock_res is not None:
        async def mock_init(self):
            return mock_res
        monkeypatch.setattr(workflow_service.Client, "initialize_orchestration_pipeline", mock_init)

    res = await jp_fetch("scheduler-plugin", "api/workflow-orchestration/initialize-pipeline", method="POST", body=body, raise_error=False)
    assert res.code == exp_code
    assert json.loads(res.body)["success"] is exp_success


async def test_initialize_pipeline_controller_exception(monkeypatch, jp_fetch):
    mocks.patch_mocks(monkeypatch)
    
    async def mock_err(self):
        raise RuntimeError("Pipeline init crash")
    
    monkeypatch.setattr(workflow_service.Client, "initialize_orchestration_pipeline", mock_err)
    valid_body = json.dumps({
        "artifactsBucket": "bkt", "environmentId": "e1", "gcpProjectId": "p1",
        "pipelineId": "pipe", "region": "us-central1", "schedulerService": "composer", "path": os.getcwd()
    })
    res = await jp_fetch("scheduler-plugin", "api/workflow-orchestration/initialize-pipeline", method="POST", body=valid_body, raise_error=False)
    assert res.code == 500
    assert "Pipeline init crash" in json.loads(res.body)["error"]

def test_client_init_defaults_and_custom():
    logger = MagicMock()
    # Missing required basic credentials
    with pytest.raises(ValueError, match="Missing required basic credentials"):
        workflow_service.Client({"access_token": "tok"}, logger, None)

    # Valid credentials with default fields
    creds_default = {"access_token": "tok", "project_id": "p1", "region_id": "r1"}
    client = workflow_service.Client(creds_default, logger, None)
    assert client.artifacts_bucket == ""
    assert client.environment_id == ""
    assert client.gcp_project_id == "p1"
    assert client.path == ""
    assert client.composer_environment == ""
    assert client.pipeline_id == "orchestration_pipeline"
    assert client.service_account == ""
    assert client.create_headers() == {"Content-Type": "application/json", "Authorization": "Bearer tok"}

    # Valid credentials with custom fields
    creds_custom = {
        "access_token": "tok", "project_id": "p1", "region_id": "r1",
        "artifacts_bucket": "bkt", "environment_id": "env1", "gcp_project_id": "custom-proj",
        "path": " /tmp ", "composer_environment": "comp1", "pipeline_id": "my_pipe",
        "service_account": "sa@proj.iam.gserviceaccount.com"
    }
    client_custom = workflow_service.Client(creds_custom, logger, None)
    assert client_custom.gcp_project_id == "custom-proj"
    assert client_custom.path == "/tmp"
    assert client_custom.composer_environment == "comp1"
    assert client_custom.pipeline_id == "my_pipe"
    assert client_custom.service_account == "sa@proj.iam.gserviceaccount.com"


def test_validate_inputs():
    logger = MagicMock()
    client = workflow_service.Client({"access_token": "t", "project_id": "p", "region_id": "r"}, logger, None)
    assert client._validate_inputs("valid-bucket-123") == []
    errs = client._validate_inputs("Invalid_Bkt!")
    assert len(errs) == 1
    assert "Invalid bucket name format" in errs[0]


def test_run_gcloud_subcommand_in_dir(tmp_path, monkeypatch):
    logger = MagicMock()
    client = workflow_service.Client({"access_token": "t", "project_id": "p", "region_id": "r"}, logger, None)
    target = str(tmp_path)
    
    async def mock_sub(cmd):
        return f"Ran {cmd}"
    
    monkeypatch.setattr(workflow_service, "async_run_gcloud_subcommand", mock_sub)

    # Test cmd passed as list
    res_list = asyncio.run(client._run_gcloud_subcommand_in_dir(["gcloud", "sub", "cmd"], target))
    assert res_list == "Ran gcloud sub cmd"

    # Test cmd passed as string
    res_str = asyncio.run(client._run_gcloud_subcommand_in_dir("gcloud sub cmd", target))
    assert res_str == "Ran gcloud sub cmd"

    # Test directory restoration in finally block even on error
    orig_dir = os.getcwd()
    async def mock_sub_err(cmd):
        raise RuntimeError("subcommand error")
    monkeypatch.setattr(workflow_service, "async_run_gcloud_subcommand", mock_sub_err)
    with pytest.raises(RuntimeError, match="subcommand error"):
        asyncio.run(client._run_gcloud_subcommand_in_dir("cmd", target))
    assert os.getcwd() == orig_dir


def test_open_jupyter_lab_in_dir(tmp_path, monkeypatch):
    logger = MagicMock()
    client = workflow_service.Client({"access_token": "t", "project_id": "p", "region_id": "r"}, logger, None)
    target = str(tmp_path)

    with patch("subprocess.Popen") as mock_popen:
        monkeypatch.setattr(workflow_service, "sys", MagicMock(executable="/usr/bin/python3"))
        client._open_jupyter_lab_in_dir(target)
        mock_popen.assert_called_once_with(
            ["/usr/bin/python3", "-m", "jupyter", "lab", target],
            cwd=target,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )

    with patch("subprocess.Popen") as mock_popen:
        monkeypatch.setattr(workflow_service, "sys", MagicMock(executable=""))
        client._open_jupyter_lab_in_dir(target)
        mock_popen.assert_called_once_with(
            ["python", "-m", "jupyter", "lab", target],
            cwd=target,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )


@pytest.mark.asyncio
async def test_check_api_status_gcp_project_error(monkeypatch):
    client = workflow_service.Client({"access_token": "t", "project_id": "p", "region_id": "r"}, MagicMock(), None)

    # GCP Project error exception
    async def err_proj():
        raise RuntimeError("Project fetch failed")
    monkeypatch.setattr(credentials, "_gcp_project", err_proj)
    assert await client.check_api_status() == []


@pytest.mark.asyncio
async def test_check_api_status_invalid_project_id_format(monkeypatch):
    client = workflow_service.Client({"access_token": "t", "project_id": "p", "region_id": "r"}, MagicMock(), None)

    # Invalid project ID regex
    async def invalid_proj():
        return "invalid project id!"
    monkeypatch.setattr(credentials, "_gcp_project", invalid_proj)
    assert await client.check_api_status() == []


@pytest.mark.asyncio
async def test_check_api_status_service_url_and_cmd_cases(monkeypatch):
    logger = MagicMock()
    client = workflow_service.Client({"access_token": "t", "project_id": "p", "region_id": "r"}, logger, None)
    
    async def mock_valid_proj():
        return "valid-p"
    monkeypatch.setattr(credentials, "_gcp_project", mock_valid_proj)

    # APIs: composer (enabled), vpc (disabled/empty url), dataproc (invalid domain regex), workflows (gcloud exec error)
    monkeypatch.setattr(workflow_service, "WORKFLOW_ORCHESTRATION_REQUIRED_APIS", ["composer", "vpc", "dataproc", "workflows"])

    async def mock_url(api):
        if api == "composer":
            return "https://composer.googleapis.com/"
        elif api == "vpc":
            return ""  # empty URL
        elif api == "dataproc":
            return "https://invalid domain!/"  # invalid domain regex match
        elif api == "workflows":
            return "https://workflows.googleapis.com/"
        return ""

    monkeypatch.setattr(urls, "gcp_service_url", mock_url)

    async def mock_run(cmd):
        if "composer.googleapis.com" in cmd:
            return "composer.googleapis.com  Composer API"
        if "workflows.googleapis.com" in cmd:
            raise RuntimeError("gcloud command failed")
        return ""

    monkeypatch.setattr(workflow_service, "async_run_gcloud_subcommand", mock_run)

    results = await client.check_api_status()
    assert len(results) == 4

    # composer: enabled True
    assert results[0]["service_name"] == "composer"
    assert results[0]["is_enabled"] is True

    # vpc: missing URL
    assert results[1]["service_name"] == "vpc"
    assert results[1]["is_enabled"] is False
    assert "Invalid service domain name" in results[1]["error"]

    # dataproc: invalid domain regex
    assert results[2]["service_name"] == "dataproc"
    assert results[2]["is_enabled"] is False
    assert "Invalid service domain name" in results[2]["error"]

    # workflows: gcloud exec error
    assert results[3]["service_name"] == "workflows"
    assert results[3]["is_enabled"] is False
    assert "gcloud command failed" in results[3]["error"]


@pytest.mark.asyncio
async def test_check_api_status_service_url_throws_exception(monkeypatch):
    client = workflow_service.Client({"access_token": "t", "project_id": "p", "region_id": "r"}, MagicMock(), None)
    
    async def mock_valid_proj():
        return "valid-p"
    monkeypatch.setattr(credentials, "_gcp_project", mock_valid_proj)
    monkeypatch.setattr(workflow_service, "WORKFLOW_ORCHESTRATION_REQUIRED_APIS", ["api1"])

    async def mock_url_err(api):
        raise RuntimeError("Service URL lookup crashed")

    monkeypatch.setattr(urls, "gcp_service_url", mock_url_err)

    results = await client.check_api_status()
    assert len(results) == 1
    assert results[0]["service_name"] == "api1"
    assert results[0]["is_enabled"] is False
    assert results[0]["service_url"] == ""
    assert "Service URL lookup crashed" in results[0]["error"]


def test_load_workflow_files(tmp_path, monkeypatch):
    client = workflow_service.Client({"access_token": "t", "project_id": "p", "region_id": "r"}, MagicMock(), None)

    # Case A: No deployment.yaml
    monkeypatch.setattr(os, "getcwd", lambda: str(tmp_path))
    res_no_deploy = client.load_workflow_files()
    assert res_no_deploy["success"] is True
    assert res_no_deploy["hasWorkflowConfig"] is False
    assert res_no_deploy["workflow_files"] == []

    # Case B: With deployment.yaml, pipeline.yaml, and non-yaml data.json
    (tmp_path / "deployment.yaml").write_text("deploy")
    (tmp_path / "pipe.yaml").write_text("pipe")
    (tmp_path / "data.json").write_text("{}")
    res_with_deploy = client.load_workflow_files()
    assert res_with_deploy["success"] is True
    assert res_with_deploy["hasWorkflowConfig"] is True
    assert len(res_with_deploy["workflow_files"]) == 1
    assert res_with_deploy["workflow_files"][0]["file_name"] == "pipe.yaml"

    # Case C: Exception during load
    monkeypatch.setattr(os, "getcwd", lambda: (_ for _ in ()).throw(RuntimeError("FS error")))
    res_err = client.load_workflow_files()
    assert res_err["success"] is False
    assert res_err["status_code"] == 500
    assert "FS error" in res_err["error"]


@pytest.mark.asyncio
async def test_initialize_pipeline_validation_and_sanitization(tmp_path, monkeypatch):
    logger = MagicMock()

    # Bucket name sanitization (file://, gs://, trailing /)
    creds_bucket_file = {
        "access_token": "t", "project_id": "p", "region_id": "r",
        "artifacts_bucket": "file://my-bucket/", "environment_id": "e1",
        "path": str(tmp_path)
    }
    c_bkt_file = workflow_service.Client(creds_bucket_file, logger, None)
    monkeypatch.setattr(c_bkt_file, "_open_jupyter_lab_in_dir", lambda target: None)

    async def mock_run_bkt_ok(cmd):
        return "my-bucket" if "my-bucket" in cmd else ""

    monkeypatch.setattr(workflow_service, "async_run_gcloud_subcommand", mock_run_bkt_ok)
    async def mock_init_in_dir(cmd, cwd):
        return "init ok"
    monkeypatch.setattr(c_bkt_file, "_run_gcloud_subcommand_in_dir", mock_init_in_dir)

    res_bkt_file = await c_bkt_file.initialize_orchestration_pipeline()
    assert res_bkt_file["status_code"] == 200

    # Path with tilde expansion to non-existent directory
    c_no_dir = workflow_service.Client({"access_token": "t", "project_id": "p", "region_id": "r", "path": "~/no_dir_xyz_123"}, logger, None)
    res_no_dir = await c_no_dir.initialize_orchestration_pipeline()
    assert res_no_dir["status_code"] == 400
    assert "Initialization directory does not exist" in res_no_dir["error"]

    # Path pointing to a file
    file_path = tmp_path / "test_file.txt"
    file_path.write_text("hello")
    c_file_path = workflow_service.Client({"access_token": "t", "project_id": "p", "region_id": "r", "path": str(file_path)}, logger, None)
    res_file_path = await c_file_path.initialize_orchestration_pipeline()
    assert res_file_path["status_code"] == 400
    assert "Initialization directory is not a directory" in res_file_path["error"]

    # Missing bucket
    c_no_bucket = workflow_service.Client({"access_token": "t", "project_id": "p", "region_id": "r", "artifacts_bucket": ""}, logger, None)
    res_no_bkt = await c_no_bucket.initialize_orchestration_pipeline()
    assert res_no_bkt["status_code"] == 400
    assert res_no_bkt["error"] == "Artifacts bucket name is required."

    # Missing environment ID
    c_no_env = workflow_service.Client({"access_token": "t", "project_id": "p", "region_id": "r", "artifacts_bucket": "gs://my-bucket/", "environment_id": ""}, logger, None)
    res_no_env = await c_no_env.initialize_orchestration_pipeline()
    assert res_no_env["status_code"] == 400
    assert res_no_env["error"] == "Environment ID is required."

    # Invalid bucket name validation format
    c_inv_bkt = workflow_service.Client({"access_token": "t", "project_id": "p", "region_id": "r", "artifacts_bucket": "Invalid_Bkt!", "environment_id": "e1"}, logger, None)
    res_inv_bkt = await c_inv_bkt.initialize_orchestration_pipeline()
    assert res_inv_bkt["status_code"] == 400
    assert "Input validation failed" in res_inv_bkt["error"]


@pytest.mark.asyncio
async def test_initialize_pipeline_bucket_describe_checks(tmp_path, monkeypatch):
    logger = MagicMock()
    creds = {
        "access_token": "t", "project_id": "p", "region_id": "r",
        "artifacts_bucket": "my-bucket", "environment_id": "e1", "path": str(tmp_path)
    }
    client = workflow_service.Client(creds, logger, None)

    # Case A: result returned does not contain bucket_name
    async def mock_run_bkt_mismatch(cmd):
        return "other-bucket-name"
    monkeypatch.setattr(workflow_service, "async_run_gcloud_subcommand", mock_run_bkt_mismatch)
    res_mismatch = await client.initialize_orchestration_pipeline()
    assert res_mismatch["status_code"] == 400
    assert "does not exist or is not accessible" in res_mismatch["error"]

    # Case B: result returned is empty
    async def mock_run_bkt_empty(cmd):
        return ""
    monkeypatch.setattr(workflow_service, "async_run_gcloud_subcommand", mock_run_bkt_empty)
    res_empty = await client.initialize_orchestration_pipeline()
    assert res_empty["status_code"] == 400

    # Case C: bucket describe throws CalledProcessError
    async def mock_run_bkt_err(cmd):
        raise subprocess.CalledProcessError(1, cmd)
    monkeypatch.setattr(workflow_service, "async_run_gcloud_subcommand", mock_run_bkt_err)
    res_err = await client.initialize_orchestration_pipeline()
    assert res_err["status_code"] == 400
    assert "does not exist or is not accessible in project" in res_err["error"]


@pytest.mark.asyncio
async def test_initialize_pipeline_composer_compatibility_checks(tmp_path, monkeypatch):
    base_creds = {
        "access_token": "t", "project_id": "p", "region_id": "r",
        "artifacts_bucket": "my-bkt", "environment_id": "env1",
        "composer_environment": "comp-env", "path": str(tmp_path)
    }
    (tmp_path / "deployment.yaml").write_text("deploy")  # Skip init scaffolding

    # Case A: Composer describe command throws CalledProcessError -> composer_result is None
    async def mock_run_comp_err(cmd):
        if "storage buckets" in cmd:
            return "my-bkt"
        if "composer environments" in cmd:
            raise subprocess.CalledProcessError(1, cmd)
        return ""

    monkeypatch.setattr(workflow_service, "async_run_gcloud_subcommand", mock_run_comp_err)
    c_err = workflow_service.Client(base_creds, MagicMock(), None)
    monkeypatch.setattr(c_err, "_open_jupyter_lab_in_dir", lambda target: None)
    assert (await c_err.initialize_orchestration_pipeline())["status_code"] == 200

    # Case B: Composer imageVersion starts with composer-2.16.11-airflow-
    async def mock_run_comp2(cmd):
        if "storage buckets" in cmd:
            return "my-bkt"
        if "composer environments" in cmd:
            return json.dumps({"config": {"softwareConfig": {"imageVersion": "composer-2.16.11-airflow-2.4"}}})
        return ""

    monkeypatch.setattr(workflow_service, "async_run_gcloud_subcommand", mock_run_comp2)
    c_comp2 = workflow_service.Client(base_creds, MagicMock(), None)
    monkeypatch.setattr(c_comp2, "_open_jupyter_lab_in_dir", lambda target: None)
    assert (await c_comp2.initialize_orchestration_pipeline())["status_code"] == 200

    # Case C: Composer imageVersion is composer-1.0 but pypiPackages contains orchestration-pipelines
    async def mock_run_pypi(cmd):
        if "storage buckets" in cmd:
            return "my-bkt"
        if "composer environments" in cmd:
            return json.dumps({"config": {"softwareConfig": {"imageVersion": "composer-1.0", "pypiPackages": {"orchestration-pipelines": "1.0"}}}})
        return ""

    monkeypatch.setattr(workflow_service, "async_run_gcloud_subcommand", mock_run_pypi)
    c_pypi = workflow_service.Client(base_creds, MagicMock(), None)
    monkeypatch.setattr(c_pypi, "_open_jupyter_lab_in_dir", lambda target: None)
    assert (await c_pypi.initialize_orchestration_pipeline())["status_code"] == 200

    # Case D: Incompatible composer environment (warning logged)
    async def mock_run_incompat(cmd):
        if "storage buckets" in cmd:
            return "my-bkt"
        if "composer environments" in cmd:
            return json.dumps({"config": {"softwareConfig": {"imageVersion": "composer-1.0", "pypiPackages": {"other": "1.0"}}}})
        return ""

    monkeypatch.setattr(workflow_service, "async_run_gcloud_subcommand", mock_run_incompat)
    c_incompat_logger = MagicMock()
    c_incompat = workflow_service.Client(base_creds, c_incompat_logger, None)
    monkeypatch.setattr(c_incompat, "_open_jupyter_lab_in_dir", lambda target: None)
    res_incompat = await c_incompat.initialize_orchestration_pipeline()
    assert res_incompat["status_code"] == 200
    assert c_incompat_logger.warning.called

    # Case E: Invalid JSON in composer output (warning logged)
    async def mock_run_invalid_json(cmd):
        if "storage buckets" in cmd:
            return "my-bkt"
        if "composer environments" in cmd:
            return "not-valid-json"
        return ""

    monkeypatch.setattr(workflow_service, "async_run_gcloud_subcommand", mock_run_invalid_json)
    c_invalid_json_logger = MagicMock()
    c_invalid_json = workflow_service.Client(base_creds, c_invalid_json_logger, None)
    monkeypatch.setattr(c_invalid_json, "_open_jupyter_lab_in_dir", lambda target: None)
    res_invalid_json = await c_invalid_json.initialize_orchestration_pipeline()
    assert res_invalid_json["status_code"] == 200
    assert c_invalid_json_logger.warning.called


@pytest.mark.asyncio
async def test_initialize_pipeline_scaffolding_and_jupyter_launch(tmp_path, monkeypatch):
    logger = MagicMock()
    creds_no_optionals = {
        "access_token": "t", "project_id": "p", "region_id": "r",
        "artifacts_bucket": "my-bkt", "environment_id": "env1",
        "path": str(tmp_path)
    }
    c_no_opt = workflow_service.Client(creds_no_optionals, logger, None)
    monkeypatch.setattr(c_no_opt, "_open_jupyter_lab_in_dir", lambda target: None)

    async def mock_run_ok(cmd):
        if "storage buckets" in cmd:
            return "my-bkt"
        return ""

    captured_init_cmd = []
    async def mock_run_dir(cmd, cwd):
        captured_init_cmd.append(cmd)
        return "Init ok"

    monkeypatch.setattr(workflow_service, "async_run_gcloud_subcommand", mock_run_ok)
    monkeypatch.setattr(c_no_opt, "_run_gcloud_subcommand_in_dir", mock_run_dir)

    res = await c_no_opt.initialize_orchestration_pipeline()
    assert res["status_code"] == 200
    assert captured_init_cmd[0] == [
        "beta", "orchestration-pipelines", "init", "orchestration_pipeline",
        "--environment=env1", "--project=p", "--region=r", "--artifacts-bucket=my-bkt"
    ]

    # Scaffolding init throws CalledProcessError
    async def mock_run_dir_err(cmd, cwd):
        raise subprocess.CalledProcessError(1, cmd)

    monkeypatch.setattr(c_no_opt, "_run_gcloud_subcommand_in_dir", mock_run_dir_err)
    res_scaf_err = await c_no_opt.initialize_orchestration_pipeline()
    assert res_scaf_err["status_code"] == 500
    assert "Failed to initialize orchestration pipeline scaffolding" in res_scaf_err["error"]

    # Jupyter Lab launch fails when path != getcwd()
    (tmp_path / "deployment.yaml").write_text("exists")
    monkeypatch.setattr(os, "getcwd", lambda: "/different/path")
    
    def mock_launch_err(target_dir):
        raise RuntimeError("Failed to spawn process")

    monkeypatch.setattr(c_no_opt, "_open_jupyter_lab_in_dir", mock_launch_err)
    res_launch_err = await c_no_opt.initialize_orchestration_pipeline()
    assert res_launch_err["status_code"] == 500
    assert "failed to launch Jupyter Lab" in res_launch_err["error"]


@pytest.mark.asyncio
async def test_initialize_pipeline_top_level_exception(tmp_path, monkeypatch):
    logger = MagicMock()
    c = workflow_service.Client({"access_token": "t", "project_id": "p", "region_id": "r", "artifacts_bucket": "bkt", "environment_id": "env1"}, logger, None)

    # Cause top-level exception in initialize_orchestration_pipeline
    monkeypatch.setattr(os, "getcwd", lambda: (_ for _ in ()).throw(RuntimeError("Top level crash")))
    res = await c.initialize_orchestration_pipeline()
    assert res["status_code"] == 500
    assert "Top level crash" in res["error"]
