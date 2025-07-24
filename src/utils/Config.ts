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

import dayjs from 'dayjs';
import { IAuthCredentials } from '../login/LoginInterfaces';
import { AuthenticationService } from '../services/AuthenticationService';
import { SchedulerLoggingService } from '../services/LoggingService';
import {
  API_HEADER_BEARER,
  API_HEADER_CONTENT_TYPE,
  HTTP_METHOD,
  STATUS_SUCCESS,
  gcpServiceUrls
} from './Const';
import { ToastOptions, toast } from 'react-toastify';
import { requestAPI } from '../handler/Handler';
import { IComposerAPIResponse } from '../scheduler/common/SchedulerInteface';

/**
 * Authentication function
 * @param checkApiEnabled
 * @returns credentials
 */
export const authApi = async (
  checkApiEnabled: boolean = true
): Promise<IAuthCredentials | undefined> => {
  const authService = await AuthenticationService.authCredentialsAPI();
  return authService;
};

export const checkConfig = async (
  setLoginError: React.Dispatch<React.SetStateAction<boolean>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setConfigError: React.Dispatch<React.SetStateAction<boolean>>
): Promise<void> => {
  const credentials: IAuthCredentials | undefined = await authApi();
  if (credentials) {
    if (credentials.login_error === 1) {
      setLoginError(true);
      setIsLoading(false);
    }
    if (credentials.config_error === 1) {
      setConfigError(true);
    }
    setIsLoading(false);
  }
};

/**
 * Helper method that wraps fetch and logs the request uri and status codes to
 * jupyter server.
 */
export async function loggedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const resp = await fetch(input, init);
  // Intentionally not waiting for log response.
  SchedulerLoggingService.logFetch(input, init, resp);
  return resp;
}

export const toastifyCustomStyle: ToastOptions<Record<string, never>> = {
  hideProgressBar: true,
  autoClose: 600000,
  theme: 'dark',
  position: toast.POSITION.BOTTOM_CENTER
};

export const toastifyCustomWidth: ToastOptions<Record<string, never>> = {
  hideProgressBar: true,
  autoClose: 600000,
  theme: 'dark',
  position: toast.POSITION.BOTTOM_CENTER,
  style: {
    width: '150%'
  }
};

export const handleDebounce = (func: any, delay: number) => {
  let timeoutId: any;
  return function (...args: any) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

/**
 * Wraps a fetch call with initial authentication to pass credentials to the request
 *
 * @param uri the endpoint to call e.g. "/clusters"
 * @param method the HTTP method used for the request
 * @param regionIdentifier option param to define what region identifier (location, region) to use
 * @param queryParams
 * @returns a promise of the fetch result
 */
export const authenticatedFetch = async (config: {
  baseUrl?: string;
  uri: string;
  method: HTTP_METHOD;
  regionIdentifier?: 'regions' | 'locations' | 'global';
  queryParams?: URLSearchParams;
  checkApiEnabled?: boolean;
}) => {
  const {
    baseUrl,
    uri,
    method,
    regionIdentifier,
    queryParams,
    checkApiEnabled
  } = config;
  const credentials = await authApi(checkApiEnabled);
  // If there is an issue with getting credentials, there is no point continuing the request.
  if (!credentials) {
    throw new Error('Error during authentication');
  }

  const requestOptions = {
    method: method,
    headers: {
      'Content-Type': API_HEADER_CONTENT_TYPE,
      Authorization: API_HEADER_BEARER + credentials.access_token
    }
  };

  const serializedQueryParams = queryParams?.toString();
  const { DATAPROC } = await gcpServiceUrls;
  const base = baseUrl ?? DATAPROC;
  let requestUrl = `${base}/projects/${credentials.project_id}`;

  if (regionIdentifier) {
    switch (regionIdentifier) {
      case 'regions':
        requestUrl = `${requestUrl}/regions/${credentials.region_id}`;
        break;
      case 'locations':
        requestUrl = `${requestUrl}/locations/${credentials.region_id}`;
        break;
      case 'global':
        requestUrl = `${requestUrl}/global`;
        break;
      default:
        assumeNeverHit(regionIdentifier);
    }
  }

  requestUrl = `${requestUrl}/${uri}`;
  if (serializedQueryParams) {
    requestUrl = `${requestUrl}?${serializedQueryParams}`;
  }

  return loggedFetch(requestUrl, requestOptions);
};

export function assumeNeverHit(_: never): void {}

export const jobTimeFormat = (startTime: string) => {
  const date = new Date(startTime);

  const formattedDate = date.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true
  });

  return formattedDate;
};

export const elapsedTime = (endTime: Date, jobStartTime: Date): string => {
  const jobEndTime = new Date(endTime);
  const elapsedMilliseconds = jobEndTime.getTime() - jobStartTime.getTime();
  const elapsedSeconds = Math.round(elapsedMilliseconds / 1000) % 60;
  const elapsedMinutes = Math.floor(elapsedMilliseconds / (1000 * 60)) % 60;
  const elapsedHours = Math.floor(elapsedMilliseconds / (1000 * 60 * 60));
  let elapsedTimeString = '';
  if (elapsedHours > 0) {
    elapsedTimeString += `${elapsedHours} hr `;
  }

  if (elapsedMinutes > 0) {
    elapsedTimeString += `${elapsedMinutes} min `;
  }
  if (elapsedSeconds > 0) {
    elapsedTimeString += `${elapsedSeconds} sec `;
  }
  return elapsedTimeString;
};

export interface ICellProps {
  getCellProps: () => React.TdHTMLAttributes<HTMLTableDataCellElement>;
  value: string | any;
  column: {
    Header: string;
  };
  row: {
    original: {
      id: string;
      status: string;
    };
  };
  render: (value: string) => React.ReactNode;
}

export interface IVertexExecutionHistoryCellProps {
  getCellProps: () => React.TdHTMLAttributes<HTMLTableDataCellElement>;
  value: string | any;
  column: {
    Header: string;
  };
  row: {
    original: {
      id: string;
      status: string;
      jobRunId: string;
      state: string;
      gcsUrl: string;
      fileName: string;
    };
  };
  render: (value: string) => React.ReactNode;
}

export interface IVertexCellProps {
  getCellProps: () => React.TdHTMLAttributes<HTMLTableDataCellElement>;
  value: string | any;
  column: {
    Header: string;
  };
  row: {
    original: {
      id: string;
      status: string;
      lastScheduledRunResponse: {
        runResponse: string;
      };
      jobState: string[];
      name: string;
      createTime: string;
      nextRunTime: string;
    };
  };
  render: (value: string) => React.ReactNode;
}

/**
 * Wraps a fetch call with initial authentication to pass credentials to the request
 *
 * @param val date object"
 * @returns new date
 */
export const currentTime = (val: any) => {
  const currentDate = dayjs(val);
  let currentTime = dayjs();
  if (val.hour() !== 0 || val.minute() !== 0) {
    currentTime = dayjs(val);
  }

  // Combine the selected date with the current time
  const newDateTime = currentDate
    .set('hour', currentTime.hour())
    .set('minute', currentTime.minute())
    .set('second', currentTime.second());

  return newDateTime;
};

export const login = async (
  setLoginError: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const data = await requestAPI('login', {
    method: 'POST'
  });
  if (typeof data === 'object' && data !== null) {
    const loginStatus = (data as { login: string }).login;
    if (loginStatus === STATUS_SUCCESS) {
      setLoginError(false);
      window.location.reload();
    } else {
      setLoginError(true);
    }
  }
};

export const findEnvironmentSelected = (
  selectedEnvironment?: string,
  composerEnvData?: IComposerAPIResponse[]
) => {
  return composerEnvData?.find(
    environment => environment.name === selectedEnvironment
  );
};
