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

import os
import shutil
import subprocess
import uuid
from datetime import datetime, timedelta
from google.cloud import storage
from google.api_core.exceptions import NotFound
import google.oauth2.credentials as oauth2
from google.cloud.jupyter_config.config import (
    async_run_gcloud_subcommand,
)
import aiofiles
import json

import aiohttp
import pendulum
from google.cloud.jupyter_config.config import gcp_account
from jinja2 import Environment, PackageLoader, select_autoescape

from scheduler_jupyter_plugin import urls
from scheduler_jupyter_plugin.commons.constants import (
    COMPOSER_SERVICE_NAME,
    CONTENT_TYPE,
    GCS,
    PACKAGE_NAME,
    WRAPPER_PAPPERMILL_FILE,
    UTF8,
    PAYLOAD_JSON_FILE_PATH,
    HTTP_STATUS_OK,
    DATAPROC_SERVICE_NAME,
)
from scheduler_jupyter_plugin.models.models import DescribeJob
from scheduler_jupyter_plugin.services import airflow


unique_id = str(uuid.uuid4().hex)
job_id = ""
job_name = ""
TEMPLATES_FOLDER_PATH = "dagTemplates"
ROOT_FOLDER = PACKAGE_NAME


class Client:
    client_session = aiohttp.ClientSession()

    def __init__(self, credentials, log, client_session):
        self.log = log
        if not (
            ("access_token" in credentials)
            and ("project_id" in credentials)
            and ("region_id" in credentials)
        ):
            self.log.exception("Missing required credentials")
            raise ValueError("Missing required credentials")
        self._access_token = credentials["access_token"]
        self.project_id = credentials["project_id"]
        self.region_id = credentials["region_id"]
        self.airflow_client = airflow.Client(credentials, log, client_session)

    def create_headers(self):
        return {
            "Content-Type": CONTENT_TYPE,
            "Authorization": f"Bearer {self._access_token}",
        }

    async def get_bucket(self, runtime_env, project_id, region_id):
        try:
            composer_url = await urls.gcp_service_url(COMPOSER_SERVICE_NAME)
            if project_id and region_id:
                api_endpoint = f"{composer_url}v1/projects/{project_id}/locations/{region_id}/environments/{runtime_env}"
            else:
                api_endpoint = f"{composer_url}v1/projects/{self.project_id}/locations/{self.region_id}/environments/{runtime_env}"
            headers = self.create_headers()
            async with self.client_session.get(
                api_endpoint, headers=headers
            ) as response:
                if response.status == HTTP_STATUS_OK:
                    resp = await response.json()
                    gcs_dag_path = resp.get("storageConfig", {}).get("bucket", "")
                    return gcs_dag_path
                else:
                    raise Exception(
                        f"Error getting composer bucket: {response.reason} {await response.text()}"
                    )
        except Exception as e:
            self.log.exception(f"Error getting bucket name: {str(e)}")
            raise Exception(f"Error getting composer bucket: {str(e)}")

    async def check_file_exists(self, bucket_name, file_path, project_id):
        try:
            if not bucket_name:
                raise ValueError("Bucket name cannot be empty")
            credentials = oauth2.Credentials(self._access_token)
            bucket = storage.Client(credentials=credentials, project=project_id).bucket(
                bucket_name
            )
            blob = bucket.blob(file_path)
            return blob.exists()
        except Exception as error:
            self.log.exception(f"Error checking file: {error}")
            raise IOError(f"Error creating dag: {error}")

    async def upload_to_gcs(
        self,
        gcs_dag_bucket,
        project_id,
        file_path=None,
        template_name=None,
        destination_dir=None,
    ):
        try:
            credentials = oauth2.Credentials(self._access_token)
            storage_client = storage.Client(credentials=credentials, project=project_id)
            bucket = storage_client.bucket(gcs_dag_bucket)
            if template_name:
                env = Environment(
                    loader=PackageLoader(PACKAGE_NAME, TEMPLATES_FOLDER_PATH),
                    autoescape=select_autoescape(["py"]),
                )
                file_path = env.get_template(template_name).filename

            if not file_path:
                raise ValueError("No file path or template name provided for upload.")
            if destination_dir:
                blob_name = f"{destination_dir}/{file_path.split('/')[-1]}"
            else:
                blob_name = f"{file_path.split('/')[-1]}"

            blob = bucket.blob(blob_name)
            blob.upload_from_filename(file_path)
            self.log.info(f"File {file_path} uploaded to gcs successfully")

        except Exception as error:
            self.log.exception(f"Error uploading file to GCS: {str(error)}")
            raise IOError(str(error))

    async def get_cluster_details(self, cluster_name):
        try:
            dataproc_url = await urls.gcp_service_url(DATAPROC_SERVICE_NAME)
            api_endpoint = f"{dataproc_url}/v1/projects/{self.project_id}/regions/{self.region_id}/clusters/{cluster_name}"
            async with self.client_session.get(
                api_endpoint, headers=self.create_headers()
            ) as response:
                if response.status == HTTP_STATUS_OK:
                    resp = await response.json()
                    return resp
                else:
                    return {
                        "error": f"Failed to fetch clusters: {response.status} {await response.text()}"
                    }

        except Exception as e:
            self.log.exception("Error fetching cluster list")
            return {"error": str(e)}

    async def multi_tenant_user_service_account(self, cluster_name):
        cluster_data = await self.get_cluster_details(cluster_name)
        if cluster_data:
            multi_tenant = (
                cluster_data.get("config", {})
                .get("softwareConfig", {})
                .get("properties", {})
                .get("dataproc:dataproc.dynamic.multi.tenancy.enabled", "false")
            )
            if multi_tenant == "true":
                cmd = "config get account"
                process = await async_run_gcloud_subcommand(cmd)
                user_email = process.strip()
                service_account = (
                    cluster_data.get("config", {})
                    .get("securityConfig", {})
                    .get("identityConfig", {})
                    .get("userServiceAccountMapping", {})
                    .get(user_email, "")
                )
                if service_account:
                    return service_account
        return ""

    async def prepare_dag(self, job, gcs_dag_bucket, dag_file, project_id, region_id):
        self.log.info("Generating dag file")
        DAG_TEMPLATE_CLUSTER_V1 = "pysparkJobTemplate-v1.txt"
        DAG_TEMPLATE_SERVERLESS_V1 = "pysparkBatchTemplate-v1.txt"
        DAG_TEMPLATE_LOCAL_V1 = "localPythonTemplate-v1.txt"
        environment = Environment(
            autoescape=True,
            loader=PackageLoader("scheduler_jupyter_plugin", TEMPLATES_FOLDER_PATH),
        )

        user = gcp_account()
        owner = user.split("@")[0]  # getting username from email
        if job.schedule_value == "":
            schedule_interval = "@once"
        else:
            schedule_interval = job.schedule_value
        if job.time_zone == "":
            yesterday = datetime.combine(
                datetime.today() - timedelta(1), datetime.min.time()
            )
            start_date = yesterday
            time_zone = ""
        else:
            yesterday = pendulum.now().subtract(days=1)
            desired_timezone = job.time_zone
            dag_timezone = pendulum.timezone(desired_timezone)
            start_date = yesterday.replace(tzinfo=dag_timezone)
            time_zone = job.time_zone
        if len(job.parameters) != 0:
            parameters = "\n".join(item.replace(":", ": ") for item in job.parameters)
        else:
            parameters = ""
        if job.local_kernel is False:
            if job.mode_selected == "cluster":
                multi_tenant_service_account = (
                    await self.multi_tenant_user_service_account(
                        cluster_name=job.cluster_name
                    )
                )
                template = environment.get_template(DAG_TEMPLATE_CLUSTER_V1)
                if not job.input_filename.startswith(GCS):
                    input_notebook = f"gs://{gcs_dag_bucket}/dataproc-notebooks/{job.name}/input_notebooks/{job.input_filename}"
                else:
                    input_notebook = job.input_filename
                content = template.render(
                    job,
                    inputFilePath=f"gs://{gcs_dag_bucket}/dataproc-notebooks/wrapper_papermill.py",
                    gcpProjectId=project_id,
                    gcpRegion=region_id,
                    input_notebook=input_notebook,
                    output_notebook=f"gs://{gcs_dag_bucket}/dataproc-output/{job.name}/output-notebooks/{job.name}_",
                    owner=owner,
                    schedule_interval=schedule_interval,
                    start_date=start_date,
                    parameters=parameters,
                    time_zone=time_zone,
                    multi_tenant_service_account=multi_tenant_service_account,
                )
            else:
                template = environment.get_template(DAG_TEMPLATE_SERVERLESS_V1)
                job_dict = job.dict()
                phs_path = (
                    job_dict.get("serverless_name", {})
                    .get("environmentConfig", {})
                    .get("peripheralsConfig", {})
                    .get("sparkHistoryServerConfig", {})
                    .get("dataprocCluster", "")
                )
                serverless_name = (
                    job_dict.get("serverless_name", {})
                    .get("jupyterSession", {})
                    .get("displayName", "")
                )
                custom_container = (
                    job_dict.get("serverless_name", {})
                    .get("runtimeConfig", {})
                    .get("containerImage", "")
                )
                metastore_service = (
                    job_dict.get("serverless_name", {})
                    .get("environmentConfig", {})
                    .get("peripheralsConfig", {})
                    .get("metastoreService", {})
                )
                version = (
                    job_dict.get("serverless_name", {})
                    .get("runtimeConfig", {})
                    .get("version", "")
                )
                if not job.input_filename.startswith(GCS):
                    input_notebook = f"gs://{gcs_dag_bucket}/dataproc-notebooks/{job.name}/input_notebooks/{job.input_filename}"
                else:
                    input_notebook = job.input_filename
                content = template.render(
                    job,
                    inputFilePath=f"gs://{gcs_dag_bucket}/dataproc-notebooks/wrapper_papermill.py",
                    gcpProjectId=project_id,
                    gcpRegion=region_id,
                    input_notebook=input_notebook,
                    output_notebook=f"gs://{gcs_dag_bucket}/dataproc-output/{job.name}/output-notebooks/{job.name}_",
                    owner=owner,
                    schedule_interval=schedule_interval,
                    start_date=start_date,
                    parameters=parameters,
                    phs_path=phs_path,
                    serverless_name=serverless_name,
                    time_zone=time_zone,
                    custom_container=custom_container,
                    metastore_service=metastore_service,
                    version=version,
                )
        else:
            template = environment.get_template(DAG_TEMPLATE_LOCAL_V1)
            if not job.input_filename.startswith(GCS):
                input_notebook = f"gs://{gcs_dag_bucket}/dataproc-notebooks/{job.name}/input_notebooks/{job.input_filename}"
            else:
                input_notebook = job.input_filename
            if len(job.parameters) != 0:
                parameters = ",".join(
                    item.replace(":", ": ") for item in job.parameters
                )
            else:
                parameters = ""
            content = template.render(
                job,
                inputFilePath=f"gs://{gcs_dag_bucket}/dataproc-notebooks/wrapper_papermill.py",
                gcpProjectId=project_id,
                gcpRegion=region_id,
                input_notebook=input_notebook,
                output_notebook=f"gs://{gcs_dag_bucket}/dataproc-output/{job.name}/output-notebooks/{job.name}_",
                owner=owner,
                schedule_interval=schedule_interval,
                start_date=start_date,
                parameters=parameters,
                time_zone=time_zone,
            )
        LOCAL_DAG_FILE_LOCATION = f"./scheduled-jobs/{job.name}"
        file_path = os.path.join(LOCAL_DAG_FILE_LOCATION, dag_file)
        os.makedirs(LOCAL_DAG_FILE_LOCATION, exist_ok=True)
        with open(file_path, mode="w", encoding="utf-8") as message:
            message.write(content)
        env = Environment(
            loader=PackageLoader(PACKAGE_NAME, "dagTemplates"),
            autoescape=select_autoescape(["py"]),
        )
        wrapper_papermill_path = env.get_template("wrapper_papermill.py").filename
        shutil.copy2(wrapper_papermill_path, LOCAL_DAG_FILE_LOCATION)
        return file_path

    async def check_package_in_env(self, composer_environment_name, region_id):
        try:
            packages = ["apache-airflow-providers-papermill", "ipykernel"]
            packages_to_install = []
            cmd = f"beta composer environments list-packages {composer_environment_name} --location {region_id}"
            process = await async_run_gcloud_subcommand(cmd)
            installed_packages = set(
                line.split()[0].lower() for line in process.splitlines()[2:]
            )
            for package in packages:
                if package.lower() not in installed_packages:
                    packages_to_install.append(package)
                else:
                    self.log.info(f"{package} is already installed.")
            return packages_to_install
        except subprocess.CalledProcessError:
            self.log.exception("Error checking packages")
            raise IOError("Error checking packages")
        except Exception as error:
            self.log.exception(f"Error checking packages: {error}")
            raise IOError(f"Error checking packages: {error}")

    async def install_to_composer_environment(
        self, local_kernel, composer_environment_name, packages_to_install, region_id
    ):
        try:
            installing_packages = "false"
            if local_kernel:
                for package in packages_to_install:
                    self.log.info(f"{package} is not installed. Installing...")
                    installing_packages = "true"
                    sub_cmd = f"composer environments update {composer_environment_name} --location {region_id} --update-pypi-package {package}"
                    await async_run_gcloud_subcommand(sub_cmd)
            return {"installing_packages": str(installing_packages)}
        except subprocess.CalledProcessError as install_error:
            self.log.exception(
                f"can not create schedule, error in installing the packages, error: {install_error.stderr}"
            )
            raise RuntimeError(
                f"can not create schedule, error in installing the packages, error: {install_error.stderr}"
            )
        except Exception as e:
            self.log.exception(f"error installing {package}: {str(e)}")
            return {"error": str(e)}

    def create_payload(self, file_path, project_id, region, input_data):
        payload = {"projectId": project_id, "region": region, "job": input_data}

        with open(file_path, "w") as f:
            json.dump(payload, f, indent=4)

    async def execute(self, input_data, project_id, region_id):
        try:
            job = DescribeJob(**input_data)
            global job_id
            global job_name
            job_id = job.dag_id
            job_name = job.name
            dag_file = f"dag_{job_name}.py"
            gcs_dag_bucket = await self.get_bucket(
                job.composer_environment_name, project_id, region_id
            )
            wrapper_pappermill_file_path = WRAPPER_PAPPERMILL_FILE
            install_packages = {}

            if job.packages_to_install != None:
                install_packages = await self.install_to_composer_environment(
                    job.local_kernel,
                    job.composer_environment_name,
                    job.packages_to_install,
                    region_id,
                )
            if install_packages and install_packages.get("error"):
                raise RuntimeError(install_packages)

            if await self.check_file_exists(
                gcs_dag_bucket, wrapper_pappermill_file_path, project_id
            ):
                print(
                    f"The file gs://{gcs_dag_bucket}/{wrapper_pappermill_file_path} exists."
                )
            else:
                await self.upload_to_gcs(
                    gcs_dag_bucket,
                    project_id,
                    template_name=WRAPPER_PAPPERMILL_FILE,
                    destination_dir="dataproc-notebooks",
                )
                print(
                    f"The file gs://{gcs_dag_bucket}/{wrapper_pappermill_file_path} does not exist."
                )
            # uploading input file while creating the job
            if not job.input_filename.startswith(GCS):
                await self.upload_to_gcs(
                    gcs_dag_bucket,
                    project_id,
                    file_path=f"./{job.input_filename}",
                    destination_dir=f"dataproc-notebooks/{job_name}/input_notebooks",
                )
            # creating a json file for payload
            self.create_payload(
                PAYLOAD_JSON_FILE_PATH, project_id, region_id, input_data
            )

            # uploading payload JSON file to GCS
            await self.upload_to_gcs(
                gcs_dag_bucket,
                project_id,
                file_path=PAYLOAD_JSON_FILE_PATH,
                destination_dir=f"dataproc-notebooks/{job_name}/dag_details",
            )

            file_path = await self.prepare_dag(
                job, gcs_dag_bucket, dag_file, project_id, region_id
            )
            await self.upload_to_gcs(
                gcs_dag_bucket, project_id, file_path=file_path, destination_dir="dags"
            )
            if install_packages.get("installing_packages") == "true":
                return {"status": 0, "response": "installed python packages"}
            else:
                return {"status": 0}
        except Exception as e:
            return {"error": str(e)}

    async def download_dag_output(
        self,
        composer_environment_name,
        bucket_name,
        dag_id,
        dag_run_id,
        project_id,
        region_id,
    ):
        try:
            await self.airflow_client.list_dag_run_task(
                composer_environment_name, dag_id, dag_run_id, project_id, region_id
            )
        except Exception:
            return {"error": f"Invalid DAG run ID {dag_run_id}"}

        try:
            credentials = oauth2.Credentials(self._access_token)
            storage_client = storage.Client(credentials=credentials)
            blob_name = (
                f"dataproc-output/{dag_id}/output-notebooks/{dag_id}_{dag_run_id}.ipynb"
            )
            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(blob_name)
            original_file_name = os.path.basename(blob_name)
            destination_file_name = os.path.join(".", original_file_name)
            async with aiofiles.open(destination_file_name, "wb") as f:
                file_data = blob.download_as_bytes()
                await f.write(file_data)
            self.log.info(
                f"Output notebook file '{original_file_name}' downloaded successfully"
            )
            return 0
        except Exception as error:
            self.log.exception(f"Error downloading output notebook file: {str(error)}")
            return {"error": str(error)}

    async def check_required_packages(self, composer_environment_name, region_id):
        try:
            res = await self.check_package_in_env(composer_environment_name, region_id)
            return res
        except Exception as e:
            return {"error": str(e)}
