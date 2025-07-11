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
from scheduler_jupyter_plugin.services import vertex


class UIConfigController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        """Returns available ui config"""
        try:
            region_id = self.get_argument("region_id")
            async with aiohttp.ClientSession() as client_session:
                client = vertex.Client(
                    await credentials.get_cached(), self.log, client_session
                )

                configs = await client.list_uiconfig(region_id)
                self.finish(json.dumps(configs))
        except Exception as e:
            self.log.exception(f"Error fetching ui config: {str(e)}")
            self.finish({"error": str(e)})


class VertexScheduleCreateController(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        try:
            input_data = self.get_json_body()
            async with aiohttp.ClientSession() as client_session:
                client = vertex.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                result = await client.create_job_schedule(input_data)
                self.finish(json.dumps(result))
        except Exception as e:
            self.log.exception(f"Error creating job schedule: {str(e)}")
            self.finish({"error": str(e)})


class BucketCreateController(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        try:
            input_data = self.get_json_body()
            async with aiohttp.ClientSession() as client_session:
                client = vertex.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                result = await client.create_new_bucket(input_data)
                self.finish(json.dumps(result))
        except Exception as e:
            self.log.exception(f"Error creating a new bucket: {str(e)}")
            self.finish({"error": str(e)})


class ScheduleListController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        """Returns available schedules"""
        try:
            region_id = self.get_argument("region_id")
            page_size = self.get_argument("page_size")
            next_page_token = self.get_argument("page_token", default=None)
            async with aiohttp.ClientSession() as client_session:
                client = vertex.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                schedules = await client.list_schedules(
                    region_id, page_size, next_page_token
                )
                self.finish(json.dumps(schedules))
        except Exception as e:
            self.log.exception(f"Error fetching list of schedules: {str(e)}")
            self.finish({"error": str(e)})


class SchedulePauseController(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        """Pauses the schedule"""
        try:
            region_id = self.get_argument("region_id")
            schedule_id = self.get_argument("schedule_id")
            async with aiohttp.ClientSession() as client_session:
                client = vertex.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                resp = await client.pause_schedule(region_id, schedule_id)
                self.finish(json.dumps(resp))
        except Exception as e:
            self.log.exception(f"Error pausing the schedule: {str(e)}")
            self.finish({"error": str(e)})


class ScheduleResumeController(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        """Resumes the paused schedule"""
        try:
            region_id = self.get_argument("region_id")
            schedule_id = self.get_argument("schedule_id")
            async with aiohttp.ClientSession() as client_session:
                client = vertex.Client(
                    await credentials.get_cached(), self.log, client_session
                )

                resp = await client.resume_schedule(region_id, schedule_id)
                self.finish(json.dumps(resp))
        except Exception as e:
            self.log.exception(f"Error resuming the schedule: {str(e)}")
            self.finish({"error": str(e)})


class ScheduleDeleteController(APIHandler):
    @tornado.web.authenticated
    async def delete(self):
        """Deletes the schedule"""
        try:
            region_id = self.get_argument("region_id")
            schedule_id = self.get_argument("schedule_id")
            async with aiohttp.ClientSession() as client_session:
                client = vertex.Client(
                    await credentials.get_cached(), self.log, client_session
                )

                resp = await client.delete_schedule(region_id, schedule_id)
                self.finish(json.dumps(resp))
        except Exception as e:
            self.log.exception(f"Error deleting the schedule: {str(e)}")
            self.finish({"error": str(e)})


class ScheduleTriggerController(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        """Trigger the schedule"""
        try:
            region_id = self.get_argument("region_id")
            schedule_id = self.get_argument("schedule_id")
            async with aiohttp.ClientSession() as client_session:
                client = vertex.Client(
                    await credentials.get_cached(), self.log, client_session
                )

                resp = await client.trigger_schedule(region_id, schedule_id)
                self.finish(json.dumps(resp))
        except Exception as e:
            self.log.exception(f"Error triggering the schedule: {str(e)}")
            self.finish({"error": str(e)})


class ScheduleUpdateController(APIHandler):
    @tornado.web.authenticated
    async def post(self):
        """Updates the schedule"""
        try:
            region_id = self.get_argument("region_id")
            schedule_id = self.get_argument("schedule_id")
            input_data = self.get_json_body()
            async with aiohttp.ClientSession() as client_session:
                client = vertex.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                resp = await client.update_schedule(region_id, schedule_id, input_data)
                self.finish(json.dumps(resp))
        except Exception as e:
            self.log.exception(f"Error updating the schedule: {str(e)}")
            self.finish({"error": str(e)})


class ScheduleGetController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        """Get the schedule"""
        try:
            region_id = self.get_argument("region_id")
            schedule_id = self.get_argument("schedule_id")
            async with aiohttp.ClientSession() as client_session:
                client = vertex.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                resp = await client.get_schedule(region_id, schedule_id)
                self.finish(json.dumps(resp))
        except Exception as e:
            self.log.exception(f"Error getting the schedule: {str(e)}")
            self.finish({"error": str(e)})


class NotebookExecutionJobListController(APIHandler):
    @tornado.web.authenticated
    async def get(self):
        """Returns list of notebook execution jobs"""
        try:
            region_id = self.get_argument("region_id")
            schedule_id = self.get_argument("schedule_id")
            page_size = self.get_argument("page_size", default=None)
            order_by = self.get_argument("order_by")
            start_date = self.get_argument("start_date", default=None)
            async with aiohttp.ClientSession() as client_session:
                client = vertex.Client(
                    await credentials.get_cached(), self.log, client_session
                )
                jobs = await client.list_notebook_execution_jobs(
                    region_id, schedule_id, order_by, page_size, start_date
                )
                self.finish(json.dumps(jobs))
        except Exception as e:
            self.log.exception(f"Error fetching notebook execution jobs: {str(e)}")
            self.finish({"error": str(e)})
