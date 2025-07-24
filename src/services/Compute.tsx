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
import { Notification } from '@jupyterlab/apputils';
import { requestAPI } from '../handler/Handler';
import { SchedulerLoggingService, LOG_LEVEL } from './LoggingService';
import { handleErrorToast } from '../utils/ErrorUtils';

export class ComputeServices {
  static readonly getParentProjectAPIService = async (
    setHostProject: (value: any) => void
  ) => {
    try {
      const formattedResponse: any = await requestAPI('api/compute/getXpnHost');
      if (Object.keys(formattedResponse).length !== 0) {
        setHostProject(formattedResponse);
      } else {
        setHostProject({});
      }
    } catch (error) {
      SchedulerLoggingService.log(
        'Error fetching host project',
        LOG_LEVEL.ERROR
      );
      setHostProject('');
      Notification.error('Failed to fetch host project', {
        autoClose: false
      });
    }
  };
  static readonly primaryNetworkAPIService = (
    setPrimaryNetworkList: (value: { name: string; link: string }[]) => void,
    setPrimaryNetworkLoading: (value: boolean) => void,
    setErrorMessagePrimaryNetwork: (value: string) => void
  ) => {
    setPrimaryNetworkLoading(true);
    requestAPI('api/compute/network')
      .then((formattedResponse: any) => {
        if (formattedResponse.length > 0) {
          const primaryNetworkList = formattedResponse.map((network: any) => ({
            name: network.name,
            link: network.selfLink
          }));
          primaryNetworkList.sort();
          setPrimaryNetworkList(primaryNetworkList);
        } else if (formattedResponse.error) {
          setErrorMessagePrimaryNetwork(formattedResponse.error);
          setPrimaryNetworkList([]);
        } else {
          setPrimaryNetworkList([]);
        }

        setPrimaryNetworkLoading(false);
      })
      .catch(error => {
        setPrimaryNetworkList([]);
        setPrimaryNetworkLoading(false);
        SchedulerLoggingService.log(
          `Error listing primary network ${error}`,
          LOG_LEVEL.ERROR
        );
        const errorResponse = `Failed to fetch primary network list : ${error}`;
        handleErrorToast({
          error: errorResponse
        });
      });
  };

  static readonly subNetworkAPIService = async (
    region: string,
    primaryNetworkSelected: string | undefined,
    setSubNetworkList: (value: { name: string; link: string }[]) => void,
    setSubNetworkLoading: (value: boolean) => void,
    setErrorMessageSubnetworkNetwork: (value: string) => void,
    setSubNetworkSelected: (
      value: {
        name: string;
        link: string;
      } | null
    ) => void
  ) => {
    setSubNetworkSelected(null);
    setSubNetworkLoading(true);
    requestAPI(
      `api/compute/subNetwork?region_id=${region}&network_id=${primaryNetworkSelected}`
    )
      .then((formattedResponse: any) => {
        if (formattedResponse.length > 0) {
          const subNetworkList = formattedResponse
            .filter((network: any) => network.privateIpGoogleAccess === true)
            .map((network: any) => ({
              name: network.name,
              link: network.selfLink
            }));
          subNetworkList.sort();
          setSubNetworkList(subNetworkList);
          setErrorMessageSubnetworkNetwork('');
        } else if (formattedResponse.error) {
          setErrorMessageSubnetworkNetwork(formattedResponse.error);
          setSubNetworkList([]);
        } else {
          setSubNetworkList([]);
        }
        setSubNetworkLoading(false);
      })
      .catch(error => {
        setSubNetworkList([]);
        setSubNetworkLoading(false);
        SchedulerLoggingService.log(
          `Error listing sub networks ${error}`,
          LOG_LEVEL.ERROR
        );
        const errorResponse = `Failed to fetch sub networks list : ${error}`;
        handleErrorToast({
          error: errorResponse
        });
      });
  };

  static readonly sharedNetworkAPIService = async (
    setSharedNetworkList: (
      value: { name: string; network: string; subnetwork: string }[]
    ) => void,
    setSharedNetworkLoading: (value: boolean) => void,
    hostProject: string,
    region: string
  ) => {
    setSharedNetworkLoading(true);
    requestAPI(
      `api/compute/sharedNetwork?project_id=${hostProject}&region_id=${region}`
    )
      .then((formattedResponse: any) => {
        if (formattedResponse.length > 0) {
          const sharedNetworkList = formattedResponse.map((network: any) => ({
            name: network.subnetwork.split('/').pop(),
            network: network.network,
            subnetwork: network.subnetwork
          }));
          sharedNetworkList.sort();
          setSharedNetworkList(sharedNetworkList);
        } else {
          setSharedNetworkList([]);
        }
        setSharedNetworkLoading(false);
      })
      .catch(error => {
        setSharedNetworkList([]);
        setSharedNetworkLoading(false);
        SchedulerLoggingService.log(
          `Error listing shared networks ${error}`,
          LOG_LEVEL.ERROR
        );
        const errorResponse = `Failed to fetch shared networks list : ${error}`;
        handleErrorToast({
          error: errorResponse
        });
      });
  };
}
