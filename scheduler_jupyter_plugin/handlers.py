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


import asyncio
import json
import os
import subprocess
from tornado import web
from jupyter_server.base.handlers import APIHandler


import tornado
from google.cloud.jupyter_config.config import (
    async_run_gcloud_subcommand,
    clear_gcloud_cache,
)
from jupyter_server.base.handlers import APIHandler
from jupyter_server.serverapp import ServerApp
from jupyter_server.utils import url_path_join
from traitlets import Undefined, Unicode
from traitlets.config import SingletonConfigurable

from scheduler_jupyter_plugin import credentials, urls
from scheduler_jupyter_plugin.controllers import (
    airflow,
    cloudKms,
    composer,
    compute,
    dataproc,
    executor,
    iam,
    logEntries,
    storage,
    version,
    vertex,
    workflow,
)


class SchedulerPluginConfig(SingletonConfigurable):
    log_path = Unicode(
        "",
        config=True,
        help="File to log ServerApp and Scheduler Jupyter Plugin events.",
    )


class SettingsHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        scheduler_plugin_config = ServerApp.instance().config.SchedulerPluginConfig
        for t, v in SchedulerPluginConfig.instance().traits().items():
            # The `SchedulerPluginConfig` config value will be a dictionary holding
            # all of the settings that were explicitly set.
            #
            # We want the returned JSON object to also include settings where we
            # fallback to a default value, so we add in any addition traits that
            # we do not yet have a value for but for which a default has been defined.
            #
            # We explicitly filter out the `config`, `parent`, and `log` attributes
            # that are inherited from the `SingletonConfigurable` class.
            if (
                t not in scheduler_plugin_config
                and t not in ["config", "parent", "log"]
                and v.default_value is not Undefined
            ):
                scheduler_plugin_config[t] = v.default_value

        self.log.info(f"SchedulerPluginConfig: {scheduler_plugin_config}")
        self.finish(json.dumps(scheduler_plugin_config))


class CredentialsHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    async def get(self):
        cached = await credentials.get_cached()
        if cached["config_error"] == 1:
            self.log.exception("Error fetching credentials from gcloud")
        self.finish(json.dumps(cached))


class LoginHandler(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        cmd = ["gcloud", "auth", "login"]
        
        try:
            loop = asyncio.get_event_loop()
            
            def run_gcloud():
                process = subprocess.Popen(
                    cmd, 
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.PIPE, 
                    stderr=subprocess.PIPE
                )
                _stdout, _stderr = process.communicate()
                return process.returncode

            # Awaiting the loop execution
            returncode = await loop.run_in_executor(None, run_gcloud)
            
            if returncode == 0:
                self.finish({"login": "SUCCEEDED"})
            else:
                self.finish({"login": "FAILED"})
                
        except Exception as e:
            self.set_status(500)
            self.finish({"login": "FAILED", "error": str(e)})


class ConfigHandler(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        ERROR_MESSAGE = "Project and region update "
        input_data = self.get_json_body()
        project_id = input_data["projectId"]
        region = input_data["region"]
        try:
            await async_run_gcloud_subcommand(f"config set project {project_id}")
            await async_run_gcloud_subcommand(f"config set dataproc/region {region}")
            self.finish({"config": ERROR_MESSAGE + "successful"})
        except subprocess.CalledProcessError:
            self.finish({"config": ERROR_MESSAGE + "failed"})


class UrlHandler(APIHandler):
    url = {}

    @tornado.web.authenticated
    async def get(self):
        url_map = await urls.map()
        self.log.info(f"Service URL map: {url_map}")
        self.finish(url_map)


class LogHandler(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        logger = self.log.getChild("SchedulerPluginClient")
        log_body = self.get_json_body()
        logger.log(log_body["level"], log_body["message"])
        self.finish({"status": "OK"})


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    application_url = "scheduler-plugin"

    def full_path(name):
        return url_path_join(base_url, application_url, name)

    handlersMap = {
        "settings": SettingsHandler,
        "credentials": CredentialsHandler,
        "login": LoginHandler,
        "configuration": ConfigHandler,
        "getGcpServiceUrls": UrlHandler,
        "log": LogHandler,
        "composerList": composer.EnvironmentListController,
        "getComposerEnvironment": composer.EnvironmentGetController,
        "dagRun": airflow.DagRunController,
        "dagRunTask": airflow.DagRunTaskController,
        "dagRunTaskLogs": airflow.DagRunTaskLogsController,
        "createJobScheduler": executor.ExecutorController,
        "dagList": airflow.DagListController,
        "dagDelete": airflow.DagDeleteController,
        "dagUpdate": airflow.DagUpdateController,
        "editJobScheduler": airflow.EditDagController,
        "importErrorsList": airflow.ImportErrorController,
        "triggerDag": airflow.TriggerDagController,
        "downloadOutput": executor.DownloadOutputController,
        "clusterList": dataproc.ClusterListController,
        "runtimeList": dataproc.RuntimeController,
        "checkRequiredPackages": executor.CheckRequiredPackagesController,
        "api/vertex/uiConfig": vertex.UIConfigController,
        "api/compute/region": compute.RegionController,
        "api/compute/network": compute.NetworkController,
        "api/compute/subNetwork": compute.SubNetworkController,
        "api/compute/sharedNetwork": compute.SharedNetworkController,
        "api/storage/listBucket": storage.CloudStorageController,
        "api/iam/listServiceAccount": iam.ServiceAccountController,
        "api/compute/getXpnHost": compute.GetXpnHostController,
        "api/vertex/listSchedules": vertex.ScheduleListController,
        "api/vertex/pauseSchedule": vertex.SchedulePauseController,
        "api/vertex/resumeSchedule": vertex.ScheduleResumeController,
        "api/vertex/deleteSchedule": vertex.ScheduleDeleteController,
        "api/vertex/triggerSchedule": vertex.ScheduleTriggerController,
        "api/vertex/updateSchedule": vertex.ScheduleUpdateController,
        "api/vertex/getSchedule": vertex.ScheduleGetController,
        "api/vertex/createJobScheduler": vertex.VertexScheduleCreateController,
        "api/storage/createNewBucket": vertex.BucketCreateController,
        "api/logEntries/listEntries": logEntries.LogEntiresListContoller,
        "api/vertex/listNotebookExecutionJobs": vertex.NotebookExecutionJobListController,
        "api/storage/downloadOutput": storage.DownloadOutputController,
        "api/storage/outputFileExists": storage.OutputFileExistsController,
        "jupyterlabVersion": version.LatestVersionController,
        "updatePlugin": version.UpdatePackageController,
        "api/cloudKms/listKeyRings": cloudKms.KeyRingsController,
        "api/cloudKms/listCryptoKeys": cloudKms.CryptoKeysController,
        
        # Orchestration workflow related endpoints
        "api/workflow-orchestration/api-enable-check": workflow.CheckApiStatusController,
        "api/workflow-orchestration/load-workflow-files": workflow.LoadWorkflowFilesController,
        "api/workflow-orchestration/initialize-pipeline": workflow.InitializeOrchestrationPipelineController,
    }
    handlers = [(full_path(name), handler) for name, handler in handlersMap.items()]
    web_app.add_handlers(host_pattern, handlers)