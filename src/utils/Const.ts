/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ConfigService } from '../services/ConfigService';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version, name } = require('../../package.json');

export const VERSION_DETAIL = version;
export const PLUGIN_NAME = name;
export const LOGIN_STATE = '1';
export const STATUS_SUCCESS = 'SUCCEEDED';
export const API_HEADER_BEARER = 'Bearer ';
export const API_HEADER_CONTENT_TYPE = 'application/json';
export const PLUGIN_ID = 'scheduler_jupyter_plugin:plugin';
export const GCS_PLUGIN_ID = 'gcs-jupyter-plugin:plugin';

export const gcpServiceUrls = (async () => {
  return await ConfigService.gcpServiceUrlsAPI();
})();

export enum HTTP_METHOD {
  GET = 'GET',
  POST = 'POST'
}
export const DEFAULT_LABEL_DETAIL = 'client:scheduler-jupyter-plugin';
export const POLLING_TIME_LIMIT = 10000;
export const POLLING_IMPORT_ERROR = 30000;
export const TITLE_LAUNCHER_CATEGORY = 'Google Cloud Resources';
export type scheduleMode = 'runNow' | 'runSchedule';
export const scheduleValueExpression = '30 17 * * 1-5'; // Expression for schedule Value in Scheduler Jobs
export const SPARK_HISTORY_SERVER = 'Spark History Server';
export const DATAPROC_CLUSTER_KEY = 'dataprocCluster';
export const DATAPROC_CLUSTER_LABEL = 'Dataproc cluster';
export const METASTORE_SERVICE_KEY = 'metastoreService';
export const METASTORE_SERVICE_LABEL = 'Metastore service';
export const NETWORK_KEY = 'networkUri';
export const NETWORK_LABEL = 'Network';
export const NETWORK_TAGS_KEY = 'networkTags';
export const NETWORK_TAGS_LABEL = 'Network tags';
export const SERVICE_ACCOUNT_KEY = 'serviceAccount';
export const SERVICE_ACCOUNT_LABEL = 'Service account';
export const SPARK_HISTORY_SERVER_KEY = 'sparkHistoryServerConfig';
export const STATUS_ACTIVE = 'ACTIVE';
export const STATUS_CREATING = 'CREATING';
export const STATUS_DELETING = 'DELETING';
export const STATUS_ERROR = 'ERROR';
export const STATUS_FAIL = 'FAILED';
export const STATUS_PROVISIONING = 'Provisioning';
export const STATUS_STARTING = 'STARTING';
export const STATUS_STOPPING = 'STOPPING';
export const STATUS_TERMINATED = 'TERMINATED';
export const STATUS_TERMINATING = 'TERMINATING';
export const SUBNETWORK_KEY = 'subnetworkUri';
export const SUBNETWORK_LABEL = 'Sub network';

export enum ClusterStatus {
  STATUS_RUNNING = 'RUNNING',
  STATUS_STOPPED = 'STOPPED',
  STATUS_ACTIVE = 'ACTIVE'
}

export const LOG_EXPLORER_BASE_URL =
  'https://console.cloud.google.com/logs/query';

export const VIEW_LOGS_BATCH_URL = `${LOG_EXPLORER_BASE_URL};query=resource.type="cloud_dataproc_batch"`;

export const VIEW_LOGS_CLUSTER_URL = `${LOG_EXPLORER_BASE_URL};query=resource.type="cloud_dataproc_cluster" resource.labels.cluster_name=`;

export const VIEW_LOGS_SESSION_URL = `${LOG_EXPLORER_BASE_URL};query=resource.type="cloud_dataproc_session"`;

export const CORN_EXP_DOC_URL =
  'https://cloud.google.com/scheduler/docs/configuring/cron-job-schedules';
export const DISK_TYPE_VALUE = [
  'pd-standard (Persistent Disk Standard',
  'pd-ssd (Persistent Disk Solid state Drive)',
  'pd-standard (Persistent Disk Hard Disk Drive)',
  'pd-balanced (Balanced Persistent Disk)',
  'pd-extreme (Extreme Persistent Disk)'
];
export type internalScheduleMode = 'cronFormat' | 'userFriendly';
export const KERNEL_VALUE = ['python3', 'pytorch', 'tensorflow'];
export const DEFAULT_CLOUD_STORAGE_BUCKET = 'default-vertex-schedules';
export const DEFAULT_MACHINE_TYPE = 'n1-standard-2 (2 CPUs, 8.05 GB RAM)';
export const DEFAULT_KERNEL = 'python3';

export const VERTEX_REGIONS = [
  'asia-east2',
  'asia-northeast1',
  'asia-northeast3',
  'asia-south1',
  'asia-southeast1',
  'australia-southeast1',
  'europe-west1',
  'northamerica-northeast1',
  'southamerica-east1',
  'us-central1',
  'us-west1',
  'us-west4'
];

export const DEFAULT_SERVICE_ACCOUNT = 'compute@developer.gserviceaccount.com';

export const DEFAULT_TIME_ZONE = 'UTC';

export const SHARED_NETWORK_DOC_URL =
  'https://cloud.google.com/vpc/docs/shared-vpc';

// Pattern to check whether string contains link
export const pattern =
  // eslint-disable-next-line
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g; // REGX to extract URL from string

export const DEFAULT_DISK_MIN_SIZE = 10;

export const DEFAULT_DISK_MAX_SIZE = 65536;

export const DEFAULT_DISK_SIZE = '100';

export const VIEW_CLOUD_LOGS = 'VIEW CLOUD LOGS';

export const HTTP_STATUS_FORBIDDEN = 403;

export const HTTP_STATUS_BAD_REQUEST = 400;

export const HTTP_STATUS_NOT_FOUND = 404;

export const VERTEX_SCHEDULE = 'vertex';

export const ABORT_MESSAGE = 'signal is aborted without reason';

export const allowedPeriodsCron = ['year', 'month', 'week', 'day', 'hour'];

export const everyMinuteCron = '* * * * *';

export const packages = ['apache-airflow-providers-papermill', 'ipykernel'];

export const composerEnvironmentStateList = ['RUNNING', 'UPDATING'];

export const composerEnvironmentStateListForCreate = 'RUNNING';

export const SUBNETWORK_VERTEX_ERROR =
  'No Subnetworks found with Google Private Access - ON';

export const DEFAULT_ENCRYPTION_SELECTED = 'googleManagedEncryption';

export const SECURITY_KEY =
  'https://console.cloud.google.com/security/kms/keyrings';

export const DEFAULT_CUSTOMER_MANAGED_SELECTION = 'key';

export const KEY_MESSAGE =
  'Example format:projects/<project-name>/locations/<location-name>/keyRings/<keyring-name>/cryptoKeys/<key-name>';

export const INPUT_HELPER_TEXT =
  'This schedule will run a copy of this notebook in its current state. If you edit the original notebook, you must create a new schedule to run the updated version of the notebook.';
export const NO_EXECUTION_FOUND =
  'There are no job executions available for this schedule';

export const EXECUTION_DATE_SELECTION_HELPER_TEXT =
  'Select a date to view schedule execution history';
