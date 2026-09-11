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

import aiohttp
from jupyter_server.base.handlers import APIHandler
from pydantic import ValidationError
import tornado

from scheduler_jupyter_plugin import credentials
from scheduler_jupyter_plugin.commons.constants import (
    HTTP_STATUS_BAD_REQUEST,
    HTTP_STATUS_INTERNAL_SERVER_ERROR,
)
from scheduler_jupyter_plugin.models.workflowSchemas import (
    PipelineInitializationSchema,
)
from scheduler_jupyter_plugin.services import workflow


class CheckApiStatusController(APIHandler):
    @tornado.web.authenticated
    async def get(self) -> None:
        """Handles GET request to check necessary orchestration APIs."""
        try:
            async with aiohttp.ClientSession() as client_session:
                creds = await credentials.get_cached()
                client = workflow.Client(creds, self.log, client_session)
                results = await client.check_api_status()
                self.finish({"success": True, "results": results})
        except Exception as e:
            self.log.exception(f"Error checking API status: {e}")
            self.set_status(HTTP_STATUS_INTERNAL_SERVER_ERROR)
            self.finish({"success": False, "error": str(e)})


class LoadWorkflowFilesController(APIHandler):
    @tornado.web.authenticated
    async def get(self) -> None:
        """Handles GET request to fetch available pipeline configuration files."""
        try:
            async with aiohttp.ClientSession() as client_session:
                creds = await credentials.get_cached()
                client = workflow.Client(creds, self.log, client_session)
                results = client.load_workflow_files()
                self.finish(results)
        except Exception as e:
            self.log.exception(f"Error loading workflow files: {e}")
            self.set_status(HTTP_STATUS_INTERNAL_SERVER_ERROR)
            self.finish({"success": False, "error": str(e)})


class InitializeOrchestrationPipelineController(APIHandler):
    @tornado.web.authenticated
    async def post(self) -> None:
        """Handles POST request to validate and spin up an orchestration pipeline."""
        try:
            input_data = self.get_json_body()
            if not input_data:
                self.set_status(HTTP_STATUS_BAD_REQUEST)
                self.finish({"success": False, "error": "Missing request body"})
                return

            # Pydantic parsing and validation
            validated_model = PipelineInitializationSchema(**input_data)

            async with aiohttp.ClientSession() as client_session:
                creds = await credentials.get_cached()
                # Inject parsed payload fields into the client initialization context
                creds.update(validated_model.dict())

                client = workflow.Client(creds, self.log, client_session)
                result = await client.initialize_orchestration_pipeline()

                # If the service client specified an alternative status, set it
                if "status_code" in result:
                    self.set_status(result["status_code"])

                self.finish(result)

        except ValidationError as ve:
            self.log.warning(f"Validation error initializing pipeline: {ve}")
            self.set_status(HTTP_STATUS_BAD_REQUEST)
            self.finish(
                {
                    "success": False,
                    "error": "Validation error",
                    "details": ve.errors(),
                }
            )
        except Exception as e:
            self.log.exception(f"Error initializing orchestration pipeline: {e}")
            self.set_status(HTTP_STATUS_INTERNAL_SERVER_ERROR)
            self.finish({"success": False, "error": str(e)})