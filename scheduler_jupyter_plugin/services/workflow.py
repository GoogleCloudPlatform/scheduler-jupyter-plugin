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
import logging
import os
import re
import subprocess
import sys
from typing import Any, Dict, List, Optional

import aiohttp
from google.cloud.jupyter_config.config import async_run_gcloud_subcommand

from scheduler_jupyter_plugin import credentials, urls
from scheduler_jupyter_plugin.commons.constants import (
    CONTENT_TYPE,
    HTTP_STATUS_BAD_REQUEST,
    HTTP_STATUS_INTERNAL_SERVER_ERROR,
    HTTP_STATUS_OK,
    WORKFLOW_ORCHESTRATION_REQUIRED_APIS,
)


class Client:
    """Client for managing GCP Workflow Orchestration configurations and validations."""

    def __init__(
        self,
        creds: Dict[str, Any],
        log: logging.Logger,
        client_session: aiohttp.ClientSession,
    ):
        self.log = log

        required_keys = ["access_token", "project_id", "region_id"]
        if not all(k in creds for k in required_keys):
            self.log.exception("Missing required basic credentials")
            raise ValueError("Missing required basic credentials")

        self._access_token: str = creds["access_token"]
        self.project_id: str = creds["project_id"]
        self.region_id: str = creds["region_id"]
        self.client_session: aiohttp.ClientSession = client_session

        self.artifacts_bucket: str = creds.get("artifacts_bucket", "")
        self.environment_id: str = creds.get("environment_id", "")
        self.gcp_project_id: str = creds.get("gcp_project_id", self.project_id)
        self.path: str = creds.get("path", "").strip()

        self.composer_environment: str = creds.get("composer_environment", "")
        self.pipeline_id: str = creds.get("pipeline_id", "orchestration_pipeline")
        self.service_account: str = creds.get("service_account", "")

    def create_headers(self) -> Dict[str, str]:
        return {"Content-Type": CONTENT_TYPE, "Authorization": f"Bearer {self._access_token}"}

    def _validate_inputs(self, bucket_name: str) -> List[str]:
        bucket_pattern = r"^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$"
        if not re.match(bucket_pattern, bucket_name):
            return [
                f"Invalid bucket name format: '{bucket_name}'. "
                "Must contain only lowercase letters, numbers, hyphens, underscores, or dots."
            ]
        return []

    async def _run_gcloud_subcommand_in_dir(self, cmd: Any, cwd: str) -> str:
        original_dir = os.getcwd()
        try:
            os.chdir(cwd)
            cmd_str = " ".join(cmd) if isinstance(cmd, list) else cmd
            return await async_run_gcloud_subcommand(cmd_str)
        finally:
            os.chdir(original_dir)

    def _open_jupyter_lab_in_dir(self, target_dir: str) -> None:
        python_executable = sys.executable or "python"
        subprocess.Popen(
            [python_executable, "-m", "jupyter", "lab", target_dir],
            cwd=target_dir,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )

    async def check_api_status(self) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        try:
            project_id = await credentials._gcp_project()
        except Exception as e:
            self.log.error(f"Failed to fetch GCP project ID: {e}")
            return results

        if not re.match(r"^[a-zA-Z0-9:-]+$", project_id):
            self.log.error(f"Invalid project ID: {project_id}")
            return results

        for api in WORKFLOW_ORCHESTRATION_REQUIRED_APIS:
            try:
                service_url = await urls.gcp_service_url(api)
                service_domain_name = service_url.split("//")[-1].split("/")[0] if service_url else ""

                if not service_domain_name or not re.match(r"^[a-zA-Z0-9.-]+$", service_domain_name):
                    error_msg = f"Invalid service domain name or service URL not found for {api}."
                    self.log.error(error_msg)
                    results.append({"service_name": api, "service_url": service_url, "is_enabled": False, "error": error_msg})
                    continue

                cmd = ["services", "list", "--enabled", f"--project={project_id}", f"--filter=NAME={service_domain_name}"]
                cmd_str = " ".join(cmd) if isinstance(cmd, list) else cmd
                result = await async_run_gcloud_subcommand(cmd_str)
                results.append({"service_name": api, "service_url": service_url, "is_enabled": bool(result and result.strip())})

            except Exception as e:
                self.log.error(f"Error checking status for service {api}: {e}", exc_info=True)
                results.append({"service_name": api, "service_url": locals().get("service_url", ""), "is_enabled": False, "error": str(e)})

        return results

    def load_workflow_files(self) -> Dict[str, Any]:
        try:
            current_dir = os.getcwd()
            deployment_file_path = os.path.join(current_dir, "deployment.yaml")

            if not os.path.exists(deployment_file_path):
                self.log.info("Deployment file (deployment.yaml) not found.")
                return {"success": True, "status_code": HTTP_STATUS_OK, "hasWorkflowConfig": False, "workflow_files": []}

            self.log.info(f"Deployment file found at: {deployment_file_path}")
            workflow_files = [
                {"file_name": file, "file_path": os.path.join(current_dir, file)}
                for file in os.listdir(current_dir)
                if file.endswith(".yaml") and file != "deployment.yaml"
            ]

            return {
                "success": True,
                "status_code": HTTP_STATUS_OK,
                "hasWorkflowConfig": True,
                "workflow_files": workflow_files,
                "deployment_file_path": deployment_file_path,
            }

        except Exception as e:
            self.log.error(f"Error loading workflow files: {e}", exc_info=True)
            return {"success": False, "status_code": HTTP_STATUS_INTERNAL_SERVER_ERROR, "error": str(e)}

    async def initialize_orchestration_pipeline(self) -> Dict[str, Any]:
        try:
            bucket_name = self.artifacts_bucket.strip() if self.artifacts_bucket else ""
            if bucket_name.startswith("file://"):
                bucket_name = bucket_name[7:]
            if bucket_name.startswith("gs://"):
                bucket_name = bucket_name[5:]
            if bucket_name.endswith("/"):
                bucket_name = bucket_name[:-1]

            target_dir = os.getcwd()
            if self.path:
                target_dir = os.path.abspath(os.path.expanduser(self.path))
                if not os.path.exists(target_dir):
                    error_msg = f"Initialization directory does not exist: {target_dir}"
                    self.log.error(error_msg)
                    return {"success": False, "status_code": HTTP_STATUS_BAD_REQUEST, "error": error_msg}
                if not os.path.isdir(target_dir):
                    error_msg = f"Initialization directory is not a directory: {target_dir}"
                    self.log.error(error_msg)
                    return {"success": False, "status_code": HTTP_STATUS_BAD_REQUEST, "error": error_msg}

            if not bucket_name:
                self.log.error("Artifacts bucket name is missing.")
                return {"success": False, "status_code": HTTP_STATUS_BAD_REQUEST, "error": "Artifacts bucket name is required."}

            if not self.environment_id:
                error_msg = "Environment ID is required."
                self.log.error(error_msg)
                return {"success": False, "status_code": HTTP_STATUS_BAD_REQUEST, "error": error_msg}

            validation_errors = self._validate_inputs(bucket_name)
            if validation_errors:
                error_label = "; ".join(validation_errors)
                self.log.error(f"Input validation failed: {error_label}")
                return {"success": False, "status_code": HTTP_STATUS_BAD_REQUEST, "error": f"Input validation failed: {error_label}"}

            bucket_check_cmd = ["storage", "buckets", "describe", f"gs://{bucket_name}", f"--project={self.gcp_project_id}"]
            try:
                result = await async_run_gcloud_subcommand(" ".join(bucket_check_cmd))
                if not result or bucket_name not in result:
                    error_msg = f"Bucket {bucket_name} does not exist or is not accessible."
                    self.log.error(error_msg)
                    return {"success": False, "status_code": HTTP_STATUS_BAD_REQUEST, "error": error_msg}
            except subprocess.CalledProcessError:
                error_msg = f"Bucket '{bucket_name}' does not exist or is not accessible in project '{self.gcp_project_id}'."
                self.log.error(error_msg)
                return {"success": False, "status_code": HTTP_STATUS_BAD_REQUEST, "error": error_msg}

            if self.composer_environment:
                composer_check_cmd = [
                    "composer", "environments", "describe", self.composer_environment,
                    f"--location={self.region_id}", f"--project={self.gcp_project_id}",
                    "--format=json(config.softwareConfig.imageVersion, config.softwareConfig.pypiPackages)",
                ]
                try:
                    composer_result = await async_run_gcloud_subcommand(" ".join(composer_check_cmd))
                except subprocess.CalledProcessError:
                    composer_result = None

                if composer_result:
                    try:
                        composer_info = json.loads(composer_result)
                        software_config = composer_info.get("config", {}).get("softwareConfig", {})
                        image_version = software_config.get("imageVersion", "")
                        pypi_packages = software_config.get("pypiPackages", {})

                        supported_prefixes = ["composer-3-airflow-", "composer-2.16.11-airflow-"]
                        is_compatible = any(image_version.startswith(p) for p in supported_prefixes) or "orchestration-pipelines" in pypi_packages
                        if not is_compatible:
                            self.log.warning(
                                f"Composer environment {self.composer_environment} may not be fully compatible! "
                                f"Image: {image_version}, PyPI Packages: {list(pypi_packages.keys())}"
                            )
                    except Exception as parse_err:
                        self.log.warning(f"Could not parse composer check output: {parse_err}")

            deployment_file_path = os.path.join(target_dir, "deployment.yaml")

            if os.path.exists(deployment_file_path):
                self.log.info("deployment.yaml already exists. Skipping scaffolding initialization.")
            else:
                self.log.info("Running gcloud beta orchestration-pipelines init command...")
                init_cmd = [
                    "beta", "orchestration-pipelines", "init", self.pipeline_id,
                    f"--environment={self.environment_id}", f"--project={self.gcp_project_id}", f"--region={self.region_id}",
                ]
                if bucket_name:
                    init_cmd.append(f"--artifacts-bucket={bucket_name}")
                if self.composer_environment:
                    init_cmd.append(f"--composer-environment={self.composer_environment}")
                if self.service_account:
                    init_cmd.append(f"--service-account={self.service_account}")

                try:
                    init_result = await self._run_gcloud_subcommand_in_dir(init_cmd, target_dir)
                    self.log.info(f"Init command output: {init_result}")
                except subprocess.CalledProcessError as init_err:
                    error_msg = f"Failed to initialize orchestration pipeline scaffolding: {init_err}"
                    self.log.error(error_msg)
                    return {"success": False, "status_code": HTTP_STATUS_INTERNAL_SERVER_ERROR, "error": error_msg}

            if self.path and os.path.abspath(os.path.expanduser(self.path)) != os.getcwd():
                try:
                    self._open_jupyter_lab_in_dir(target_dir)
                    self.log.info(f"Opened Jupyter Lab at {target_dir}")
                except Exception as launch_err:
                    self.log.error(f"Failed to open new Jupyter Lab for {target_dir}: {launch_err}", exc_info=True)
                    return {
                        "success": False,
                        "status_code": HTTP_STATUS_INTERNAL_SERVER_ERROR,
                        "error": f"Pipeline created, but failed to launch Jupyter Lab at {target_dir}: {launch_err}",
                    }

            return {"success": True, "status_code": HTTP_STATUS_OK, "message": "Orchestration pipeline initialized successfully."}

        except Exception as e:
            self.log.error(f"Error initializing orchestration pipeline: {e}", exc_info=True)
            return {"success": False, "status_code": HTTP_STATUS_INTERNAL_SERVER_ERROR, "error": str(e)}