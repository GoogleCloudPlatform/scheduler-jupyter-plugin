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

import aiohttp
import tornado
from jupyter_server.base.handlers import APIHandler

from scheduler_jupyter_plugin import credentials
from scheduler_jupyter_plugin.services import composer


class EnvironmentListController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        """Returns names of available composer environments"""
        try:
            project_id = self.get_argument("project_id")
            region_id = self.get_argument("region_id")
            async with aiohttp.ClientSession() as client_session:
                client = composer.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                environments = await client.list_environments(project_id, region_id)
                self.set_header("Content-Type", "application/json")
                self.finish(json.dumps(environments, default=lambda x: x.dict()))
        except Exception as e:
            self.log.exception(f"Error fetching composer environments: {str(e)}")
            self.finish({"error": str(e)})

class EnvironmentGetController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        """Returns details of composer environment"""
        try:
            env_name = self.get_argument("env_name")
            async with aiohttp.ClientSession() as client_session:
                client = composer.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                environment = await client.get_environment(env_name)
                self.set_header("Content-Type", "application/json")
                self.finish(json.dumps(environment, default=lambda x: x.dict()))
        except Exception as e:
            self.log.exception(f"Error fetching composer environment: {str(e)}")
            self.finish({"error": str(e)})

