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

import re


CLOUDKMS_SERVICE_NAME = "cloudkms"
CLOUDRESOURCEMANAGER_SERVICE_NAME = "cloudresourcemanager"
COMPUTE_SERVICE_DEFAULT_URL = "https://compute.googleapis.com/compute/v1"
COMPUTE_SERVICE_NAME = "compute"
DATACATALOG_SERVICE_NAME = "datacatalog"
DATAPROC_SERVICE_NAME = "dataproc"
METASTORE_SERVICE_NAME = "metastore"
STORAGE_SERVICE_DEFAULT_URL = "https://storage.googleapis.com/storage/v1/"
STORAGE_SERVICE_NAME = "storage"
COMPOSER_SERVICE_NAME = "composer"
CONTENT_TYPE = "application/json"
GCS = "gs://"
PACKAGE_NAME = "scheduler_jupyter_plugin"
WRAPPER_PAPPERMILL_FILE = "wrapper_papermill.py"
TAGS = "scheduler_jupyter_plugin"
VERTEX_STORAGE_BUCKET = "vertex-schedules"
UTF8 = "utf-8"
PAYLOAD_JSON_FILE_PATH = "payload.json"

WORKFLOW_ORCHESTRATION_REQUIRED_APIS = [
    COMPOSER_SERVICE_NAME,
    STORAGE_SERVICE_NAME
]

# Composer environment name restrictions are documented here:
#  https://cloud.google.com/composer/docs/reference/rest/v1/projects.locations.environments#resource:-environment
COMPOSER_ENVIRONMENT_REGEXP = re.compile("[a-z]([a-z0-9-]{0,62}[a-z0-9])?")

# DAG ID name restrictions are documented here:
#  https://airflow.apache.org/docs/apache-airflow/2.1.3/_api/airflow/models/dag/index.html
DAG_ID_REGEXP = re.compile("([a-zA-Z0-9_.-])+")

# This matches the requirements set by the scheduler form.
AIRFLOW_JOB_REGEXP = re.compile("[a-zA-Z0-9_-]+")

# Bucket name restrictions are documented here:
#  https://cloud.google.com/storage/docs/buckets#naming
BUCKET_NAME_REGEXP = re.compile("[a-z][a-z0-9_.-]{1,61}[a-z0-9]")

# DAG run IDs are largely free-form, but we still enforce some sanity checking
#  on them in case the generated ID might cause issues with how we generate
#  output file names.
DAG_RUN_ID_REGEXP = re.compile("[a-zA-Z0-9_:\\+.-]+")

HTTP_STATUS_OK = 200
HTTP_STATUS_NO_CONTENT = 204
HTTP_STATUS_FORBIDDEN = 403
HTTP_STATUS_INTERNAL_SERVER_ERROR = 500
HTTP_STATUS_NETWORK_CONNECT_TIMEOUT = 599
HTTP_STATUS_BAD_REQUEST = 400
HTTP_STATUS_UNAUTHORIZED = 401
HTTP_STATUS_NOT_FOUND = 404