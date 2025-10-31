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
import { toast } from 'react-toastify';
import { Notification } from '@jupyterlab/apputils';
import { requestAPI } from '../handler/Handler';
import { SchedulerLoggingService, LOG_LEVEL } from './LoggingService';
import { toastifyCustomStyle, toastifyCustomWidth } from '../utils/Config';
import {
  ICreatePayload,
  IVertexScheduleList,
  IVertexScheduleRunList,
  IDeleteSchedulerAPIResponse,
  IMachineType,
  ISchedulerData,
  ITriggerSchedule,
  IUpdateSchedulerAPIResponse,
  IFormattedResponse,
  IKeyRingPayload,
  ICryptoListKeys,
  IFetchLastRunPayload
} from '../scheduler/vertex/VertexInterfaces';
import dayjs, { Dayjs } from 'dayjs';
import {
  ABORT_MESSAGE,
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  DEFAULT_TIME_ZONE,
  HTTP_STATUS_FORBIDDEN,
  pattern
} from '../utils/Const';
import React, { Dispatch, SetStateAction } from 'react';
import ExpandToastMessage from '../scheduler/common/ExpandToastMessage';
import { handleErrorToast } from '../utils/ErrorUtils';

export class VertexServices {
  static readonly machineTypeAPIService = (
    region: string,
    setMachineTypeList: (value: IMachineType[]) => void,
    setMachineTypeLoading: (value: boolean) => void,
    setIsApiError: (value: boolean) => void,
    setApiError: (value: string) => void,
    setApiEnableUrl: any
  ) => {
    setMachineTypeLoading(true);
    requestAPI(`api/vertex/uiConfig?region_id=${region}`)
      .then((formattedResponse: any) => {
        if (formattedResponse.length > 0) {
          setMachineTypeList(formattedResponse);
        } else if (formattedResponse.length === undefined) {
          try {
            if (
              'code' in formattedResponse.error &&
              formattedResponse.error.code === HTTP_STATUS_FORBIDDEN
            ) {
              // Pattern to check whether string contains link
              const pattern =
                // eslint-disable-next-line
                /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g; // REGX to extract URL from string
              const url = formattedResponse.error.message.match(pattern);
              if (url && url.length > 0) {
                setIsApiError(true);
                setApiError(formattedResponse.error.message);
                setApiEnableUrl(url);
              } else {
                setApiError(formattedResponse.error.message);
              }
            } else {
              throw formattedResponse.error;
            }
          } catch (error) {
            const errorResponse = `Error fetching machine type list: ${error}`;
            toast.error(
              <ExpandToastMessage message={errorResponse} />,
              errorResponse.length > 500
                ? toastifyCustomWidth
                : toastifyCustomStyle
            );
          }
        } else {
          setMachineTypeList([]);
        }
        setMachineTypeLoading(false);
      })
      .catch(error => {
        setMachineTypeList([]);
        setMachineTypeLoading(false);
        SchedulerLoggingService.log(
          `Error listing machine type list: ${error}`,
          LOG_LEVEL.ERROR
        );
        const errorResponse = `Failed to fetch machine type list: ${error}`;
        handleErrorToast({
          error: errorResponse
        });
      });
  };

  static readonly createVertexSchedulerService = async (
    payload: ICreatePayload,
    setCreateCompleted: (value: boolean) => void,
    setCreatingVertexScheduler: (value: boolean) => void,
    setCreateMode: (value: boolean) => void
  ) => {
    setCreatingVertexScheduler(true);
    try {
      const data: any = await requestAPI('api/vertex/createJobScheduler', {
        body: JSON.stringify(payload),
        method: 'POST'
      });
      if (data.error) {
        handleErrorToast({
          error: data.error
        });
        setCreatingVertexScheduler(false);
      } else {
        Notification.success(
          `Job ${payload.display_name} successfully created`,
          {
            autoClose: false
          }
        );
        setCreatingVertexScheduler(false);
        setCreateCompleted(true);
        setCreateMode(true);
      }
    } catch (reason: any) {
      setCreatingVertexScheduler(false);
      SchedulerLoggingService.log(
        `Error creating schedule: ${reason}`,
        LOG_LEVEL.ERROR
      );
      handleErrorToast({
        error: reason
      });
    }
  };

  static readonly editVertexJobSchedulerService = async (
    jobId: string,
    region: string,
    payload: ICreatePayload,
    setCreateCompleted: (value: boolean) => void,
    setCreatingVertexScheduler: (value: boolean) => void,
    gcsPath: string,
    setEditMode: (value: boolean) => void,
    setCreateMode: (value: boolean) => void
  ) => {
    setCreatingVertexScheduler(true);
    if (gcsPath) {
      payload.gcs_notebook_source = gcsPath;
    }
    try {
      const data: any = await requestAPI(
        `api/vertex/updateSchedule?region_id=${region}&schedule_id=${jobId}`,
        {
          body: JSON.stringify(payload),
          method: 'POST'
        }
      );
      if (data.error) {
        handleErrorToast({
          error: data.error
        });
        setCreatingVertexScheduler(false);
      } else {
        Notification.success(
          `Job ${payload.display_name} successfully updated`,
          {
            autoClose: false
          }
        );
        setCreatingVertexScheduler(false);
        setCreateCompleted(true);
        setEditMode(false);
        setCreateMode(true);
      }
    } catch (reason: any) {
      setCreatingVertexScheduler(false);
      handleErrorToast({
        error: reason
      });
    }
  };

  static readonly listVertexSchedules = async (
    setVertexScheduleList: (
      value:
        | IVertexScheduleList[]
        | ((prevItems: IVertexScheduleList[]) => IVertexScheduleList[])
    ) => void,
    region: string,
    setIsLoading: (value: boolean) => void,
    setIsApiError: (value: boolean) => void,
    setApiError: (value: string) => void,
    setNextPageToken: (value: string | null) => void, // function for setting the next page token
    newPageToken: string | null | undefined, // token of page to be fetched
    setHasNextPageToken: (value: boolean) => void, // true if there are more items that were not fetched
    setApiEnableUrl: any,
    pageLength: number = 25, // number of items to be fetched
    abortControllers?: any
  ) => {
    setIsLoading(true);
    setIsApiError(false);
    setApiError('');

    try {
      // setting controller to abort pending api call
      const controller = new AbortController();
      abortControllers.current.push(controller);
      const signal = controller.signal;

      const serviceURL = 'api/vertex/listSchedules';
      let urlparam = `?region_id=${region}&page_size=${pageLength}`;
      if (newPageToken) {
        urlparam += `&page_token=${newPageToken}`;
      }

      // API call
      const formattedResponse = await requestAPI(serviceURL + urlparam, {
        signal
      });

      if (!formattedResponse || Object.keys(formattedResponse).length === 0) {
        setVertexScheduleList([]);
        setNextPageToken(null);
        setHasNextPageToken(false);
        return;
      }

      const { schedules, nextPageToken, error } =
        formattedResponse as IFormattedResponse;

      // Handle API error
      if (error?.code === HTTP_STATUS_FORBIDDEN) {
        const url = error.message.match(pattern);
        if (url && url.length > 0) {
          setIsApiError(true);
          setApiError(error.message);
          setApiEnableUrl(url);
        } else {
          setApiError(error.message);
        }

        return;
      }

      // Handle schedule data
      if (schedules && schedules.length > 0) {
        setVertexScheduleList(schedules);

        // Handle pagination
        nextPageToken
          ? setNextPageToken(nextPageToken)
          : setNextPageToken(null);
        // Adding a slight delay for DOM refresh
        await new Promise(resolve => requestAnimationFrame(resolve));

        // Fetch Last run status asynchronously without waiting for completion
        schedules.forEach((schedule: IVertexScheduleList) => {
          // Triggering fetch asynchronously
          VertexServices.fetchLastFiveRunStatus(
            schedule,
            region,
            setVertexScheduleList,
            abortControllers
          );
        });
        setIsLoading(false); // Stop loading after everything is complete
      } else {
        setVertexScheduleList([]);
        setNextPageToken(null);
        setHasNextPageToken(false);
        setIsLoading(false);
      }
    } catch (error: any) {
      if (typeof error === 'object' && error !== null) {
        if (
          error instanceof TypeError &&
          error.toString().includes(ABORT_MESSAGE)
        ) {
          return;
        }
      } else {
        // Handle errors during the API call
        setVertexScheduleList([]);
        setNextPageToken(null);
        setHasNextPageToken(false);
        setIsApiError(true);
        setApiError('An error occurred while fetching schedules.');
        SchedulerLoggingService.log(
          `Error listing vertex schedules ${error}`,
          LOG_LEVEL.ERROR
        );
        handleErrorToast({
          error: error
        });
      }
    } finally {
      setIsLoading(false); // Ensure loading is stopped
    }
  };

  static readonly handleUpdateSchedulerPauseAPIService = async (
    scheduleId: string,
    region: string,
    displayName: string,
    setResumeLoading: (value: string) => void,
    abortControllers: any
  ) => {
    setResumeLoading(scheduleId);

    // setting controller to abort pending api call
    const controller = new AbortController();
    abortControllers.current.push(controller);
    const signal = controller.signal;

    try {
      const serviceURL = 'api/vertex/pauseSchedule';
      const formattedResponse: IUpdateSchedulerAPIResponse = await requestAPI(
        serviceURL + `?region_id=${region}&&schedule_id=${scheduleId}`,
        {
          method: 'POST',
          signal
        }
      );
      if (Object.keys(formattedResponse).length === 0) {
        Notification.success(`Schedule ${displayName} updated successfully`, {
          autoClose: false
        });
        setResumeLoading('');
      } else {
        setResumeLoading('');
        SchedulerLoggingService.log('Error in pause schedule', LOG_LEVEL.ERROR);
        Notification.error('Failed to pause schedule', {
          autoClose: false
        });
      }
    } catch (error) {
      setResumeLoading('');
      if (typeof error === 'object' && error !== null) {
        if (
          error instanceof TypeError &&
          error.toString().includes(ABORT_MESSAGE)
        ) {
          return;
        }
      } else {
        SchedulerLoggingService.log(
          `Error in pause schedule ${error}`,
          LOG_LEVEL.ERROR
        );
        const errorResponse = `Failed to pause schedule : ${error}`;
        handleErrorToast({
          error: errorResponse
        });
      }
    }
  };

  static readonly handleUpdateSchedulerResumeAPIService = async (
    scheduleId: string,
    region: string,
    displayName: string,
    setResumeLoading: (value: string) => void,
    abortControllers: any
  ) => {
    setResumeLoading(scheduleId);

    // setting controller to abort pending api call
    const controller = new AbortController();
    abortControllers.current.push(controller);
    const signal = controller.signal;

    try {
      const serviceURL = 'api/vertex/resumeSchedule';
      const formattedResponse: IUpdateSchedulerAPIResponse = await requestAPI(
        serviceURL + `?region_id=${region}&schedule_id=${scheduleId}`,
        {
          method: 'POST',
          signal
        }
      );
      if (Object.keys(formattedResponse).length === 0) {
        Notification.success(`Schedule ${displayName} updated successfully`, {
          autoClose: false
        });
        setResumeLoading('');
      } else {
        setResumeLoading('');
        SchedulerLoggingService.log(
          'Error in resume schedule',
          LOG_LEVEL.ERROR
        );
        Notification.error('Failed to resume schedule', {
          autoClose: false
        });
      }
    } catch (error) {
      setResumeLoading('');
      if (typeof error === 'object' && error !== null) {
        if (
          error instanceof TypeError &&
          error.toString().includes(ABORT_MESSAGE)
        ) {
          return;
        }
      } else {
        SchedulerLoggingService.log(
          `Error in resume schedule ${error}`,
          LOG_LEVEL.ERROR
        );
        const errorResponse = `Failed to resume schedule : ${error}`;
        handleErrorToast({
          error: errorResponse
        });
      }
    }
  };

  static readonly triggerSchedule = async (
    region: string,
    scheduleId: string,
    displayName: string,
    setTriggerLoading: (value: string) => void,
    abortControllers: any
  ) => {
    setTriggerLoading(scheduleId);

    // setting controller to abort pending api call
    const controller = new AbortController();
    abortControllers.current.push(controller);
    const signal = controller.signal;

    try {
      const serviceURL = 'api/vertex/triggerSchedule';
      const data: ITriggerSchedule = await requestAPI(
        serviceURL + `?region_id=${region}&schedule_id=${scheduleId}`,
        { method: 'POST', signal }
      );
      if (data.name) {
        setTriggerLoading('');
        Notification.success(`${displayName} triggered successfully `, {
          autoClose: false
        });
      } else {
        setTriggerLoading('');
        Notification.error(`Failed to Trigger ${displayName}`, {
          autoClose: false
        });
      }
    } catch (reason) {
      setTriggerLoading('');
      if (typeof reason === 'object' && reason !== null) {
        if (
          reason instanceof TypeError &&
          reason.toString().includes(ABORT_MESSAGE)
        ) {
          return;
        }
      } else {
        SchedulerLoggingService.log(
          `Error in Trigger schedule ${reason}`,
          LOG_LEVEL.ERROR
        );
        const errorResponse = `Failed to Trigger schedule : ${reason}`;
        handleErrorToast({
          error: errorResponse
        });
      }
    }
  };

  static readonly handleDeleteSchedulerAPIService = async (
    region: string,
    scheduleId: string,
    displayName: string
  ) => {
    try {
      const serviceURL = 'api/vertex/deleteSchedule';
      const deleteResponse: IDeleteSchedulerAPIResponse = await requestAPI(
        serviceURL + `?region_id=${region}&schedule_id=${scheduleId}`,
        { method: 'DELETE' }
      );
      return deleteResponse;
    } catch (error) {
      SchedulerLoggingService.log(
        `Error in Delete api ${error}`,
        LOG_LEVEL.ERROR
      );
      const errorResponse = `Failed to delete the ${displayName} : ${error}`;
      handleErrorToast({
        error: errorResponse
      });
    }
  };

  static readonly editVertexSchedulerService = async (
    scheduleId: string,
    region: string,
    setInputNotebookFilePath: (value: string) => void,
    setEditNotebookLoading: (value: string) => void
  ) => {
    setEditNotebookLoading(scheduleId);
    try {
      const serviceURL = 'api/vertex/getSchedule';
      const formattedResponse: any = await requestAPI(
        serviceURL + `?region_id=${region}&schedule_id=${scheduleId}`
      );
      if (
        Object.prototype.hasOwnProperty.call(
          formattedResponse.createNotebookExecutionJobRequest
            .notebookExecutionJob,
          'gcsNotebookSource'
        )
      ) {
        setInputNotebookFilePath(
          formattedResponse.createNotebookExecutionJobRequest
            .notebookExecutionJob.gcsNotebookSource.uri
        );
      } else {
        setEditNotebookLoading('');
        Notification.error('File path not found', {
          autoClose: false
        });
      }
    } catch (reason) {
      setEditNotebookLoading('');
      const errorResponse = `Error in updating notebook.\n${reason}`;
      handleErrorToast({
        error: errorResponse
      });
    }
  };

  static readonly editVertexSJobService = async (
    jobId: string,
    region: string,
    setEditScheduleLoading: (value: string) => void,
    setCreateCompleted: (value: boolean) => void,
    setRegion: (value: string) => void,
    setSubNetworkList: (value: { name: string; link: string }[]) => void,
    setEditMode: (value: boolean) => void,
    abortControllers: any,
    setVertexScheduleDetails: (value: ICreatePayload) => void
  ) => {
    setEditScheduleLoading(jobId);
    // setting controller to abort pending api call
    const controller = new AbortController();
    abortControllers.current.push(controller);
    const signal = controller.signal;
    try {
      const serviceURL = 'api/vertex/getSchedule';
      const formattedResponse: any = await requestAPI(
        serviceURL + `?region_id=${region}&schedule_id=${jobId}`,
        { signal }
      );

      if (formattedResponse && Object.keys(formattedResponse).length > 0) {
        const inputFileName =
          formattedResponse.createNotebookExecutionJobRequest.notebookExecutionJob.gcsNotebookSource.uri.split(
            '/'
          );

        let primaryNetwork = '';
        if (
          Object.hasOwn(
            formattedResponse.createNotebookExecutionJobRequest
              .notebookExecutionJob.customEnvironmentSpec,
            'networkSpec'
          ) &&
          Object.hasOwn(
            formattedResponse.createNotebookExecutionJobRequest
              .notebookExecutionJob.customEnvironmentSpec?.networkSpec,
            'network'
          )
        ) {
          primaryNetwork =
            formattedResponse.createNotebookExecutionJobRequest.notebookExecutionJob.customEnvironmentSpec.networkSpec.network.split(
              '/'
            );
        }

        let subnetwork = '';
        if (
          Object.hasOwn(
            formattedResponse.createNotebookExecutionJobRequest
              .notebookExecutionJob.customEnvironmentSpec,
            'networkSpec'
          ) &&
          Object.hasOwn(
            formattedResponse.createNotebookExecutionJobRequest
              .notebookExecutionJob.customEnvironmentSpec?.networkSpec,
            'subnetwork'
          )
        ) {
          subnetwork =
            formattedResponse.createNotebookExecutionJobRequest.notebookExecutionJob.customEnvironmentSpec.networkSpec.subnetwork.split(
              '/'
            );
        }
        const scheduleDetails: ICreatePayload = {
          job_id: jobId,
          input_filename: inputFileName[inputFileName.length - 1],
          display_name: formattedResponse.displayName,
          machine_type:
            formattedResponse.createNotebookExecutionJobRequest
              .notebookExecutionJob.customEnvironmentSpec.machineSpec
              .machineType,
          accelerator_count:
            formattedResponse.createNotebookExecutionJobRequest
              .notebookExecutionJob.customEnvironmentSpec.machineSpec
              .acceleratorCount,
          accelerator_type:
            formattedResponse.createNotebookExecutionJobRequest
              .notebookExecutionJob.customEnvironmentSpec.machineSpec
              .acceleratorType,
          kernel_name:
            formattedResponse.createNotebookExecutionJobRequest
              .notebookExecutionJob.kernelName,
          schedule_value: undefined,
          max_run_count: formattedResponse.maxRunCount,
          region: region,
          cloud_storage_bucket:
            formattedResponse.createNotebookExecutionJobRequest.notebookExecutionJob.gcsOutputUri.replace(
              'gs://',
              ''
            ),
          service_account: {
            displayName: '',
            email:
              formattedResponse.createNotebookExecutionJobRequest
                .notebookExecutionJob.serviceAccount
          },
          network: {
            name: primaryNetwork
              ? primaryNetwork[primaryNetwork.length - 1]
              : '',
            link: primaryNetwork
              ? formattedResponse.createNotebookExecutionJobRequest
                  .notebookExecutionJob.customEnvironmentSpec.networkSpec
                  .network
              : ''
          },
          subnetwork: {
            name: subnetwork ? subnetwork[subnetwork.length - 1] : '',
            link: subnetwork
              ? formattedResponse.createNotebookExecutionJobRequest
                  .notebookExecutionJob.customEnvironmentSpec.networkSpec
                  .subnetwork
              : ''
          },
          start_time: null,
          end_time: null,
          scheduleMode:
            formattedResponse.cron === '* * * * *' &&
            formattedResponse.maxRunCount === '1'
              ? 'runNow'
              : 'runSchedule',
          disk_type:
            formattedResponse.createNotebookExecutionJobRequest
              .notebookExecutionJob.customEnvironmentSpec.persistentDiskSpec
              .diskType,
          disk_size:
            formattedResponse.createNotebookExecutionJobRequest
              .notebookExecutionJob.customEnvironmentSpec.persistentDiskSpec
              .diskSizeGb,
          gcs_notebook_source:
            formattedResponse.createNotebookExecutionJobRequest
              .notebookExecutionJob.gcsNotebookSource.uri
        };
        setCreateCompleted(false);
        setRegion(region);

        if (
          'encryptionSpec' in
            formattedResponse.createNotebookExecutionJobRequest
              .notebookExecutionJob &&
          'kmsKeyName' in
            formattedResponse.createNotebookExecutionJobRequest
              .notebookExecutionJob.encryptionSpec
        ) {
          scheduleDetails.kms_key_name =
            formattedResponse.createNotebookExecutionJobRequest.notebookExecutionJob.encryptionSpec.kmsKeyName;
        }

        if (
          Object.prototype.hasOwnProperty.call(
            formattedResponse.createNotebookExecutionJobRequest
              .notebookExecutionJob,
            'parameters'
          )
        ) {
          // Parameters for future scope
          const parameterList = Object.keys(
            formattedResponse.createNotebookExecutionJobRequest
              .notebookExecutionJob.parameters
          ).map(
            key =>
              key +
              ':' +
              formattedResponse.createNotebookExecutionJobRequest
                .notebookExecutionJob.parameters[key]
          );

          scheduleDetails.parameters = parameterList;
        } else {
          scheduleDetails.parameters = [];
        }

        setSubNetworkList([
          {
            name: subnetwork[subnetwork.length - 1],
            link: subnetwork[subnetwork.length - 1]
          }
        ]);

        if (formattedResponse.cron.includes('TZ')) {
          // Remove time zone from cron string. ex: TZ=America/New_York * * * * * to * * * * *
          const firstSpaceIndex = formattedResponse.cron.indexOf(' ');
          const timeZone = formattedResponse.cron.substring(0, firstSpaceIndex);
          scheduleDetails.time_zone = timeZone.split('=')[1];
          const cron = formattedResponse.cron.substring(firstSpaceIndex + 1);
          scheduleDetails.cron = cron;
        } else {
          scheduleDetails.time_zone = DEFAULT_TIME_ZONE;
          scheduleDetails.cron = formattedResponse.cron;
        }

        const start_time = formattedResponse.startTime;
        const end_time = formattedResponse.endTime;
        scheduleDetails.start_time = start_time ? dayjs(start_time) : null;
        scheduleDetails.end_time = start_time ? dayjs(end_time) : null;
        setVertexScheduleDetails(scheduleDetails);
        setEditMode(true);
      } else {
        setEditScheduleLoading('');
        Notification.error('File path not found', {
          autoClose: false
        });
      }
    } catch (reason) {
      setEditScheduleLoading('');
      if (typeof reason === 'object' && reason !== null) {
        if (
          reason instanceof TypeError &&
          reason.toString().includes(ABORT_MESSAGE)
        ) {
          return;
        }
      } else {
        SchedulerLoggingService.log(
          `Error in update api ${reason}`,
          LOG_LEVEL.ERROR
        );
        const errorResponse = `Error in updating notebook. ${reason}`;
        handleErrorToast({
          error: errorResponse
        });
      }
    }
  };

  static readonly executionHistoryServiceList = async (
    region: string,
    schedulerData: ISchedulerData | undefined,
    selectedMonth: Dayjs | null,
    setIsLoading: (value: boolean) => void,
    setVertexScheduleRunsList: (value: IVertexScheduleRunList[]) => void,
    setGreyListDates: (value: string[]) => void,
    setRedListDates: (value: string[]) => void,
    setGreenListDates: (value: string[]) => void,
    setDarkGreenListDates: (value: string[]) => void,
    abortControllers: any
  ) => {
    setIsLoading(true);

    // setting controller to abort pending api call
    const controller = new AbortController();
    abortControllers.current.push(controller);
    const signal = controller.signal;
    const selected_month = selectedMonth?.format('YYYY-MM-DDTHH:mm:ssZ[Z]');
    const schedule_id = schedulerData?.name.split('/').pop();
    const serviceURL = 'api/vertex/listNotebookExecutionJobs';
    const formattedResponse: any = await requestAPI(
      serviceURL +
        `?region_id=${region}&schedule_id=${schedule_id}&start_date=${selected_month}&order_by=createTime desc`,
      { signal }
    );
    try {
      let transformDagRunListDataCurrent = [];
      if (formattedResponse && formattedResponse.length > 0) {
        transformDagRunListDataCurrent = formattedResponse.map(
          (jobRun: any) => {
            const createTime = new Date(jobRun.createTime);
            const updateTime = new Date(jobRun.updateTime);
            const timeDifferenceMilliseconds =
              updateTime.getTime() - createTime.getTime(); // Difference in milliseconds
            const totalSeconds = Math.floor(timeDifferenceMilliseconds / 1000); // Convert to seconds
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;

            let codeValue = '',
              statusMessage = '';
            if (Object.hasOwn(jobRun, 'status')) {
              codeValue = jobRun.status.code;
              statusMessage = jobRun.status.message;
            }

            return {
              jobRunId: jobRun.name.split('/').pop(),
              startDate: jobRun.createTime,
              endDate: jobRun.updateTime,
              gcsUrl: jobRun.gcsOutputUri,
              state: jobRun.jobState.split('_')[2].toLowerCase(),
              date: new Date(jobRun.createTime),
              fileName: jobRun.gcsNotebookSource.uri.split('/').pop(),
              time: `${minutes} min ${seconds} sec`,
              code:
                jobRun.jobState === 'JOB_STATE_FAILED'
                  ? (codeValue ?? '')
                  : '-',
              statusMessage:
                jobRun.jobState === 'JOB_STATE_FAILED'
                  ? (statusMessage ?? '')
                  : '-'
            };
          }
        );
      }

      // Group data by date and state
      const groupedDataByDateStatus = transformDagRunListDataCurrent.reduce(
        (result: any, item: any) => {
          const date = item.date; // Group by date
          const status = item.state; // Group by state

          result[date] ??= {};

          result[date][status] ??= [];

          result[date][status].push(item);

          return result;
        },
        {}
      );

      // Initialize grouping lists
      const greyList: string[] = [];
      const redList: string[] = [];
      const greenList: string[] = [];
      const darkGreenList: string[] = [];

      // Process grouped data
      Object.keys(groupedDataByDateStatus).forEach(dateValue => {
        if (
          groupedDataByDateStatus[dateValue].running ||
          groupedDataByDateStatus[dateValue].queued ||
          groupedDataByDateStatus[dateValue].pending ||
          groupedDataByDateStatus[dateValue].unspecified ||
          groupedDataByDateStatus[dateValue].paused ||
          groupedDataByDateStatus[dateValue].updating
        ) {
          greyList.push(dateValue);
        } else if (
          groupedDataByDateStatus[dateValue].failed ||
          groupedDataByDateStatus[dateValue].cancelled ||
          groupedDataByDateStatus[dateValue].expired ||
          groupedDataByDateStatus[dateValue].partially
        ) {
          redList.push(dateValue);
        } else if (
          groupedDataByDateStatus[dateValue].succeeded &&
          groupedDataByDateStatus[dateValue].succeeded.length === 1
        ) {
          greenList.push(dateValue);
        } else {
          darkGreenList.push(dateValue);
        }
      });

      // Update state lists with their respective transformations
      setGreyListDates(greyList);
      setRedListDates(redList);
      setGreenListDates(greenList);
      setDarkGreenListDates(darkGreenList);
      setVertexScheduleRunsList(transformDagRunListDataCurrent);
    } catch (error) {
      if (typeof error === 'object' && error !== null) {
        if (
          error instanceof TypeError &&
          error.toString().includes(ABORT_MESSAGE)
        ) {
          return;
        }
      } else {
        SchedulerLoggingService.log(
          `Error in execution history api ${error}`,
          LOG_LEVEL.ERROR
        );
        const errorResponse = `Error in fetching the execution history : ${error}`;
        handleErrorToast({
          error: errorResponse
        });
      }
    }
    setIsLoading(false);
  };

  //Funtion to check weather output file exists or not
  static readonly outputFileExists = async (
    bucketName: string | undefined,
    jobRunId: string | undefined,
    fileName: string | undefined,
    setIsLoading: Dispatch<SetStateAction<boolean>>,
    setFileExists: Dispatch<SetStateAction<boolean>>,
    abortControllers: any
  ) => {
    // setting controller to abort pending api call
    const controller = new AbortController();
    abortControllers.current.push(controller);
    const signal = controller.signal;

    try {
      const formattedResponse = await requestAPI(
        `api/storage/outputFileExists?bucket_name=${bucketName}&job_run_id=${jobRunId}&file_name=${fileName}`,
        { signal }
      );
      setFileExists(formattedResponse === 'true');
      setIsLoading(false);
    } catch (lastRunError: any) {
      if (typeof lastRunError === 'object' && lastRunError !== null) {
        if (
          lastRunError instanceof TypeError &&
          lastRunError.toString().includes(ABORT_MESSAGE)
        ) {
          return;
        }
      } else {
        SchedulerLoggingService.log(
          `Error checking output file ${lastRunError}`,
          LOG_LEVEL.ERROR
        );
      }
    }
  };

  // Fetch last run execution for the schedule
  static readonly fetchLastRunStatus = async (
    fetchLastRunPayload: IFetchLastRunPayload
  ) => {
    try {
      const { schedule, region, abortControllers } = fetchLastRunPayload;
      // Controller to abort pending API call
      const controller = new AbortController();
      abortControllers?.current.push(controller);
      const signal = controller.signal;

      //Extract Schedule id from schedule name.
      const scheduleId = schedule.name.split('/').pop();
      const serviceURLLastRunResponse = 'api/vertex/listNotebookExecutionJobs';
      const jobExecutionList: any = await requestAPI(
        serviceURLLastRunResponse +
          `?region_id=${region}&schedule_id=${scheduleId}&page_size=1&order_by=createTime desc`,
        { signal }
      );

      return jobExecutionList[0].createTime;
    } catch (error: any) {
      SchedulerLoggingService.log(
        'Error fetching last five job executions',
        LOG_LEVEL.ERROR
      );
    }
  };

  //Funtion to fetch last five run status for Scheduler Listing screen.
  static readonly fetchLastFiveRunStatus = (
    schedule: any,
    region: string,
    setVertexScheduleList: (
      value:
        | IVertexScheduleList[]
        | ((prevItems: IVertexScheduleList[]) => IVertexScheduleList[])
    ) => void,
    abortControllers: any
  ) => {
    // Controller to abort pending API call
    const controller = new AbortController();
    abortControllers?.current.push(controller);
    const signal = controller.signal;

    //Extract Schedule id from schedule name.
    const scheduleId = schedule.name.split('/').pop();
    const serviceURLLastRunResponse = 'api/vertex/listNotebookExecutionJobs';
    requestAPI(
      serviceURLLastRunResponse +
        `?region_id=${region}&schedule_id=${scheduleId}&page_size=5&order_by=createTime desc`,
      { signal }
    )
      .then((jobExecutionList: any) => {
        const lastFiveRun = jobExecutionList.map((job: any) => job.jobState);
        schedule.jobState = lastFiveRun;

        setVertexScheduleList((prevItems: IVertexScheduleList[]) =>
          prevItems.map(prevItem =>
            prevItem.displayName === schedule.name
              ? { ...prevItem, jobState: lastFiveRun }
              : prevItem
          )
        );
      })
      .catch((lastRunError: any) => {
        setVertexScheduleList((prevItems: IVertexScheduleList[]) =>
          prevItems.map(prevItem =>
            prevItem.displayName === schedule.name
              ? { ...prevItem, jobState: [] }
              : prevItem
          )
        );
        SchedulerLoggingService.log(
          'Error fetching last five job executions',
          LOG_LEVEL.ERROR
        );
      });
  };

  //Funtion to key rings from KMS
  static readonly listKeyRings = async (
    listKeyRingsPayload: IKeyRingPayload
  ) => {
    try {
      const { region, projectId, accessToken } = listKeyRingsPayload;
      const keyRingList = await requestAPI(
        `api/cloudKms/listKeyRings?region_id=${region}&project_id=${projectId}`,
        {
          headers: {
            'Content-Type': API_HEADER_CONTENT_TYPE,
            Authorization: API_HEADER_BEARER + accessToken
          }
        }
      );
      return keyRingList;
    } catch (error: any) {
      const errorResponse = `Error in Key Rings : ${error}`;
      handleErrorToast({
        error: errorResponse
      });
      SchedulerLoggingService.log('Error Key Rings', LOG_LEVEL.ERROR);
    }
  };

  // Function to list crypto keys from KmS key ring
  static listCryptoKeysAPIService = async (
    listKeysPayload: ICryptoListKeys
  ) => {
    const { credentials, keyRing } = listKeysPayload;
    const listKeys = requestAPI(
      `api/cloudKms/listCryptoKeys?region_id=${credentials.region}&project_id=${credentials.projectId}&key_ring=${keyRing}`,
      {
        headers: {
          'Content-Type': API_HEADER_CONTENT_TYPE,
          Authorization: API_HEADER_BEARER + credentials.accessToken
        }
      }
    )
      .then((response: any) => {
        return response;
      })
      .catch((error: Error) => {
        const errorResponse = `Error listing Keys : ${error}`;
        handleErrorToast({
          error: errorResponse
        });
        SchedulerLoggingService.log('Error listing Keys', LOG_LEVEL.ERROR);
      });

    return listKeys;
  };
}
