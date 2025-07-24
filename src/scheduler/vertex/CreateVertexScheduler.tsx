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
import React, { useEffect, useState } from 'react';
import { IThemeManager } from '@jupyterlab/apputils';
import { JupyterLab } from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  Autocomplete,
  TextField,
  Radio,
  Button,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { Cron, PeriodType } from 'react-js-cron';
import tzdata from 'tzdata';
import dayjs from 'dayjs';
import { Input } from '../../controls/MuiWrappedInput';
import { RegionDropdown } from '../../controls/RegionDropdown';
import { authApi, currentTime } from '../../utils/Config';
import {
  allowedPeriodsCron,
  CORN_EXP_DOC_URL,
  DEFAULT_CLOUD_STORAGE_BUCKET,
  DEFAULT_DISK_MAX_SIZE,
  DEFAULT_DISK_MIN_SIZE,
  DEFAULT_DISK_SIZE,
  DEFAULT_KERNEL,
  DEFAULT_MACHINE_TYPE,
  DEFAULT_SERVICE_ACCOUNT,
  DISK_TYPE_VALUE,
  everyMinuteCron,
  internalScheduleMode,
  KERNEL_VALUE,
  scheduleMode,
  scheduleValueExpression,
  SHARED_NETWORK_DOC_URL,
  SUBNETWORK_VERTEX_ERROR,
  VERTEX_REGIONS,
  VERTEX_SCHEDULE
} from '../../utils/Const';
import LearnMore from '../common/LearnMore';
import ErrorMessage from '../common/ErrorMessage';
import { VertexServices } from '../../services/Vertex';
import { ComputeServices } from '../../services/Compute';
import { IamServices } from '../../services/Iam';
import { StorageServices } from '../../services/Storage';
import {
  IAcceleratorConfig,
  ICreatePayload,
  IMachineType
} from './VertexInterfaces';
import VertexScheduleJobs from './VertexScheduleJobs';
import { renderTimeViewClock } from '@mui/x-date-pickers';
import { handleErrorToast } from '../../utils/ErrorUtils';

const CreateVertexScheduler = ({
  themeManager,
  app,
  context,
  createCompleted,
  setCreateCompleted,
  jobNameSelected,
  setJobNameSelected,
  inputFileSelected,
  setInputFileSelected,
  editMode,
  setEditMode,
  setExecutionPageFlag,
  setIsApiError,
  setApiError,
  jobNameSpecialValidation,
  setExecutionPageListFlag,
  apiError,
  setApiEnableUrl,
  isApiError,
  setListingScreenFlag
}: {
  themeManager: IThemeManager;
  app: JupyterLab;
  context: any;
  settingRegistry: ISettingRegistry;
  createCompleted: boolean;
  setCreateCompleted: React.Dispatch<React.SetStateAction<boolean>>;
  jobNameSelected: string;
  setJobNameSelected: React.Dispatch<React.SetStateAction<string>>;
  inputFileSelected: string;
  setInputFileSelected: React.Dispatch<React.SetStateAction<string>>;
  editMode: boolean;
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  setExecutionPageFlag: React.Dispatch<React.SetStateAction<boolean>>;
  setIsApiError: React.Dispatch<React.SetStateAction<boolean>>;
  setApiError: React.Dispatch<React.SetStateAction<string>>;
  jobNameSpecialValidation: boolean;
  setExecutionPageListFlag: React.Dispatch<React.SetStateAction<boolean>>;
  apiError: string;
  setApiEnableUrl: any;
  isApiError: boolean;
  setListingScreenFlag: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [vertexSchedulerDetails, setVertexSchedulerDetails] =
    useState<ICreatePayload | null>();
  const [creatingVertexScheduler, setCreatingVertexScheduler] =
    useState<boolean>(false);

  const [machineTypeLoading, setMachineTypeLoading] = useState<boolean>(false);
  const [cloudStorageLoading, setCloudStorageLoading] =
    useState<boolean>(false);
  const [serviceAccountLoading, setServiceAccountLoading] =
    useState<boolean>(false);
  const [primaryNetworkLoading, setPrimaryNetworkLoading] =
    useState<boolean>(false);
  const [subNetworkLoading, setSubNetworkLoading] = useState<boolean>(false);
  const [sharedNetworkLoading, setSharedNetworkLoading] =
    useState<boolean>(false);
  const [hostProject, setHostProject] = useState<any>({});
  const [region, setRegion] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [kernelSelected, setKernelSelected] = useState<string | null>(
    KERNEL_VALUE.find(
      option => option === context?.sessionContext?.kernelPreference?.name
    ) || DEFAULT_KERNEL
  );
  const [machineTypeList, setMachineTypeList] = useState<IMachineType[]>([]);
  const [machineTypeSelected, setMachineTypeSelected] = useState<string | null>(
    null
  );
  const [acceleratorType, setAcceleratorType] = useState<string | null>(null);
  const [acceleratedCount, setAcceleratedCount] = useState<string | null>(null);
  const [networkSelected, setNetworkSelected] = useState<string>(
    'networkInThisProject'
  );
  const [cloudStorageList, setCloudStorageList] = useState<string[]>([]);
  const [cloudStorage, setCloudStorage] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState<string>('');
  const [isCreatingNewBucket, setIsCreatingNewBucket] = useState(false);
  const [newBucketOption, setNewBucketOption] = useState(false);
  const [bucketError, setBucketError] = useState<string>('');
  const [diskTypeSelected, setDiskTypeSelected] = useState<string | null>(
    DISK_TYPE_VALUE[0]
  );
  const [diskSize, setDiskSize] = useState<string>(DEFAULT_DISK_SIZE);
  const [serviceAccountList, setServiceAccountList] = useState<
    { displayName: string; email: string }[]
  >([]);
  const [serviceAccountSelected, setServiceAccountSelected] = useState<{
    displayName: string;
    email: string;
  } | null>(null);
  const [primaryNetworkList, setPrimaryNetworkList] = useState<
    { name: string; link: string }[]
  >([]);
  const [primaryNetworkSelected, setPrimaryNetworkSelected] = useState<{
    name: string;
    link: string;
  } | null>(null);
  const [subNetworkList, setSubNetworkList] = useState<
    { name: string; link: string }[]
  >([]);
  const [subNetworkSelected, setSubNetworkSelected] = useState<{
    name: string;
    link: string;
  } | null>(null);
  const [sharedNetworkList, setSharedNetworkList] = useState<
    { name: string; network: string; subnetwork: string }[]
  >([]);
  const [sharedNetworkSelected, setSharedNetworkSelected] = useState<{
    name: string;
    network: string;
    subnetwork: string;
  } | null>(null);
  const [maxRuns, setMaxRuns] = useState<string>('');
  const [scheduleField, setScheduleField] = useState<string>('');
  const [scheduleMode, setScheduleMode] = useState<scheduleMode>('runNow');
  const [internalScheduleMode, setInternalScheduleMode] =
    useState<internalScheduleMode>('cronFormat');
  const [scheduleValue, setScheduleValue] = useState(scheduleValueExpression);
  const [timeZoneSelected, setTimeZoneSelected] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const timezones = Object.keys(tzdata.zones).sort();
  const [startDate, setStartDate] = useState<dayjs.Dayjs | string | null>(
    dayjs()
  );
  const [endDate, setEndDate] = useState<dayjs.Dayjs | string | null>(dayjs());
  const [endDateError, setEndDateError] = useState<boolean>(false);
  const [jobId, setJobId] = useState<string>('');
  const [gcsPath, setGcsPath] = useState('');
  const [loaderRegion, setLoaderRegion] = useState<boolean>(false);
  const [isPastStartDate, setIsPastStartDate] = useState<boolean>(false);
  const [isPastEndDate, setIsPastEndDate] = useState<boolean>(false);
  const [errorMessageBucket, setErrorMessageBucket] = useState<string>('');
  const [errorMessageServiceAccount, setErrorMessageServiceAccount] =
    useState<string>('');
  const [errorMessagePrimaryNetwork, setErrorMessagePrimaryNetwork] =
    useState<string>('');
  const [errorMessageSubnetworkNetwork, setErrorMessageSubnetworkNetwork] =
    useState<string>('');
  const [diskSizeFlag, setDiskSizeFlag] = useState<boolean>(false);
  const [createMode, setCreateMode] = useState<boolean>(false);

  /**
   * Changing the region value and empyting the value of machineType, accelratorType and accelratorCount
   * @param {string} value selected region
   */
  const handleRegionChange = (value: React.SetStateAction<string>) => {
    setRegion(value);
    setMachineTypeSelected(null);
    setMachineTypeList([]);
    setAcceleratedCount(null);
    setAcceleratorType(null);
  };

  /**
   * Handles Kernel selection
   * @param {React.SetStateAction<string | null>} kernelValue selected kernel
   */
  const handleKernel = (kernelValue: React.SetStateAction<string | null>) => {
    setKernelSelected(kernelValue);
  };

  /**
   * Handles Disk type selection
   * @param {React.SetStateAction<string | null>} diskValue selected Disk type
   */
  const handleDiskType = (diskValue: React.SetStateAction<string | null>) => {
    setDiskTypeSelected(diskValue);
  };

  /**
   * Handles Disk size selection
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event triggered by the input field.
   */
  const handleDiskSize = (e: React.ChangeEvent<HTMLInputElement>) => {
    const re = /^[1-9][0-9]*$/; // Checks whether value starts with [1-9] and all occurence should be a number [0-9]
    if (e.target.value === '' || re.test(e.target.value)) {
      setDiskSize(e.target.value);
    }
  };

  /**
   * Handles changes to the Disk Size input field when it is empty.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event triggered by the input field.
   */
  const handleDefaultDiskSize = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === '') {
      setDiskSize('100');
    }
  };

  /**
   * Handles changes to the Schedule input field.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event triggered by the input field.
   */
  const handleSchedule = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Prevent space as the first character
    if (newValue === '' || newValue[0] !== ' ' || scheduleField !== '') {
      setScheduleField(newValue);
    }
  };

  /**
   * Handles primary network selection.
   * @param {{ name: string; link: string; } | null} primaryValue - The selected network kernel or `null` if none is selected.
   */
  const handlePrimaryNetwork = (
    primaryValue: React.SetStateAction<{ name: string; link: string } | null>
  ) => {
    setPrimaryNetworkSelected(primaryValue);
    setSubNetworkSelected(null);
    subNetworkAPI(primaryValue?.name);
  };

  /**
   * Handles Service account selection
   * @param {{ displayName: string; email: string; } | null} value selected service account
   */
  const handleServiceAccountChange = (
    value:
      | { displayName: string; email: string }
      | ((
          prevState: { displayName: string; email: string } | null
        ) => { displayName: string; email: string } | null)
      | null
  ) => {
    setServiceAccountSelected(value);
  };

  /**
   * Handles Sub Network selection
   * @param {{ name: string; link: string; } | null} subNetworkValue - The selected network kernel or `null` if none is selected.
   */
  const handleSubNetwork = (
    subNetworkValue: React.SetStateAction<{ name: string; link: string } | null>
  ) => {
    setSubNetworkSelected(subNetworkValue);
  };

  /**
   * Handles Shared Network selection
   * @param {{ name: string; network: string; subnetwork: string; } | null} shredNetworkValue - The selected network kernel or `null` if none is selected.
   */
  const handleSharedNetwork = (
    shredNetworkValue: React.SetStateAction<{
      name: string;
      network: string;
      subnetwork: string;
    } | null>
  ) => {
    setSharedNetworkSelected(shredNetworkValue);
  };

  /**
   * Creates a new cloud storage bucket.
   * It calls an API to create the bucket, updates the state with the bucket name,
   * and then refetches the list of cloud storage buckets.
   */
  const createNewBucket = () => {
    if (!searchValue.trim()) {
      // If search value is empty
      return;
    }
    // calling an API to create a new cloud storage bucket here
    newCloudStorageAPI();
    // Reset the cloud storage value
    setCloudStorage(searchValue);
    // fetch the cloud storage API again to list down all the values with newly created bucket name
    cloudStorageAPI();
  };

  /**
   * Handles Cloud storage selection
   * @param {React.SetStateAction<string | null>} value - Selected cloud storage or "Create and Select" option.
   * @returns {void}
   */
  const handleCloudStorageSelected = (value: string | null) => {
    setBucketError('');

    if (value === `Create and Select "${searchValue}"`) {
      setNewBucketOption(true);
      createNewBucket();
      setErrorMessageBucket('');
    } else {
      setCloudStorage(value);
    }
  };

  /**
   * Handles the change in the search input value.
   * Updates the search value state based on the user's input.
   *
   * @param {React.ChangeEvent<{}>} event - The event triggered by the input field change.
   * @param {string} newValue - The new value entered by the user in the search field.
   */
  const handleSearchChange = (
    event: React.ChangeEvent<object>,
    newValue: string
  ) => {
    setSearchValue(newValue);
  };

  /**
   * Filters the cloud storage bucket options based on the user's search input.
   * If no matches are found, adds the option to create a new bucket.
   * @param {string[]} options - The list of available cloud storage buckets.
   * @param {any} state - The state object containing the search input value.
   */
  const filterOptions = (options: string[], state: any) => {
    const inputValue = state.inputValue.trim().toLowerCase();
    // If the input value is empty, return the original options
    const filteredOptions = options.filter(option =>
      option.toLowerCase().includes(inputValue)
    );

    // If no options match the search input, add the option to create a new bucket
    const exactMatch = options.some(
      option => option.toLowerCase() === inputValue
    );
    // If no exact match is found, add the option to create a new bucket
    if (!exactMatch && inputValue !== '') {
      filteredOptions.push(`Create and Select "${state.inputValue}"`);
    }

    return filteredOptions;
  };

  /**
   * Handles Machine type selection
   * @param {React.SetStateAction<string | null>} machineType selected machine type
   */
  const handleMachineType = (
    machineType: React.SetStateAction<string | null>
  ) => {
    setMachineTypeSelected(machineType);
    setAcceleratedCount(null);
    setAcceleratorType(null);
  };

  /**
   * Handles changes to the Max Runs input field.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event triggered by the input field.
   */
  const handleMaxRuns = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Regular expression to validate positive integers without leading zeros
    const re = /^[1-9][0-9]*$/;
    if (e.target.value === '' || re.test(e.target.value)) {
      setMaxRuns(e.target.value);
    }
  };

  /**
   * Handles Acceleration Type listing
   * @param {AcceleratorConfig} acceleratorConfig acceleratorConfigs data
   */
  const getAcceleratedType = (acceleratorConfig: IAcceleratorConfig[]) => {
    return acceleratorConfig.map(
      (item: { acceleratorType: string }) => item.acceleratorType
    );
  };

  /**
   * Handles Acceleration Type selection
   * @param {React.SetStateAction<string | null>} acceleratorType accelerationType selected
   */
  const handleAccelerationType = (
    acceleratorType: React.SetStateAction<string | null>
  ) => {
    setAcceleratorType(acceleratorType);
  };

  /**
   * Handles Acceleration Count selection
   * @param {React.SetStateAction<string | null>} acceleratorCount accelerationType count selected
   */
  const handleAcceleratorCount = (
    acceleratorCount: React.SetStateAction<string | null>
  ) => {
    setAcceleratedCount(acceleratorCount);
  };

  /**
   * Handles Network selection
   * @param {{ target: { value: React.SetStateAction<string>; }; }} eventValue network selected
   */
  const handleNetworkSelection = (eventValue: {
    target: { value: React.SetStateAction<string> };
  }) => {
    if (networkSelected === 'networkInThisProject') {
      if (!editMode) {
        setSharedNetworkSelected(null);
      }
    }
    if (networkSelected === 'networkShared') {
      if (!editMode) {
        setPrimaryNetworkSelected(null);
        setSubNetworkSelected(null);
      }
    }
    setNetworkSelected(eventValue.target.value);
  };

  /**
   * Handles start date selection and set the endDateError to true if end date is greater than start date
   * @param {string | null | any} val Start date selected
   */
  const handleStartDate = (val: string | null | any) => {
    if (val) {
      const newDateTime = currentTime(val);
      setStartDate(newDateTime);
    }

    if (val && endDate && dayjs(endDate).isBefore(dayjs(val))) {
      setEndDateError(true);
    } else {
      setEndDateError(false);
    }

    if (val && dayjs(val).isBefore(dayjs())) {
      setIsPastStartDate(true);
    } else {
      setIsPastStartDate(false);
    }
  };

  /**
   * Handles end date selection and set the endDateError to true if end date is greater than start date
   * @param {string | null | any} val End date selected
   */
  const handleEndDate = (val: string | null | any) => {
    if (val) {
      const endDateValue = currentTime(val);
      setEndDate(endDateValue);
    }

    if (
      startDate &&
      (dayjs(val).isBefore(dayjs(startDate)) ||
        dayjs(val).isSame(dayjs(startDate), 'minute'))
    ) {
      setEndDateError(true);
    } else {
      setEndDateError(false);
    }

    if (val && dayjs(val).isBefore(dayjs())) {
      setIsPastEndDate(true);
    } else {
      setIsPastEndDate(false);
    }
  };

  /**
   * Handles schedule mode selection
   * @param {React.ChangeEvent<HTMLInputElement>} event - The change event triggered by the radio button field.
   */
  const handleSchedulerModeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = (event.target as HTMLInputElement).value;
    setScheduleMode(newValue as scheduleMode);
    if (newValue === 'runNow') {
      setStartDate(null);
      setEndDate(null);
      setScheduleField('');
    }
    if (newValue === 'runSchedule' && scheduleValue === '') {
      setScheduleValue(scheduleField);
    }
    if (newValue === 'runSchedule') {
      setInternalScheduleMode('cronFormat');
    }
  };

  /**
   * Handles Internal schedule mode selection
   * @param {React.ChangeEvent<HTMLInputElement>} event - The change event triggered by the radio button field.
   */
  const handleInternalSchedulerModeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = (event.target as HTMLInputElement).value;
    if (newValue === 'userFriendly') {
      const cronValue =
        scheduleField === '' ? scheduleValueExpression : scheduleField;
      setScheduleValue(cronValue);
    }
    if (newValue === 'cronFormat') {
      setScheduleField(scheduleValue);
    }
    setInternalScheduleMode(newValue as internalScheduleMode);
  };

  /**
   * Handles Time zone selection
   * @param {string | null} data time zone selected
   */
  const handleTimeZoneSelected = (data: string | null) => {
    if (data) {
      const selectedTimeZone = data.toString();
      setTimeZoneSelected(selectedTimeZone);
    }
  };

  /**
   * Hosts the parent project API service
   */
  const hostProjectAPI = async () => {
    await ComputeServices.getParentProjectAPIService(setHostProject);
  };

  /**
   * Hosts the machine type API service
   */
  const machineTypeAPI = () => {
    VertexServices.machineTypeAPIService(
      region,
      setMachineTypeList,
      setMachineTypeLoading,
      setIsApiError,
      setApiError,
      setApiEnableUrl
    );
  };

  /**
   * Hosts the cloud storage API service
   */
  const cloudStorageAPI = () => {
    StorageServices.cloudStorageAPIService(
      setCloudStorageList,
      setCloudStorageLoading,
      setErrorMessageBucket
    );
  };

  /**
   * To create the new cloud storage bucket API service
   */
  const newCloudStorageAPI = () => {
    StorageServices.newCloudStorageAPIService(
      searchValue,
      setIsCreatingNewBucket,
      setBucketError
    );
  };

  /**
   * Hosts the service account API service
   */
  const serviceAccountAPI = () => {
    IamServices.serviceAccountAPIService(
      setServiceAccountList,
      setServiceAccountLoading,
      setErrorMessageServiceAccount
    );
  };

  /**
   * Hosts the primary network API service
   */
  const primaryNetworkAPI = () => {
    ComputeServices.primaryNetworkAPIService(
      setPrimaryNetworkList,
      setPrimaryNetworkLoading,
      setErrorMessagePrimaryNetwork
    );
  };

  /**
   * Hosts the sub network API service based on the primary network
   */
  const subNetworkAPI = (primaryNetwork: string | undefined) => {
    ComputeServices.subNetworkAPIService(
      region,
      primaryNetwork,
      setSubNetworkList,
      setSubNetworkLoading,
      setErrorMessageSubnetworkNetwork,
      setSubNetworkSelected
    );
  };

  /**
   * Hosts the shared network API service
   */
  const sharedNetworkAPI = () => {
    ComputeServices.sharedNetworkAPIService(
      setSharedNetworkList,
      setSharedNetworkLoading,
      hostProject?.name,
      region
    );
  };

  const selectedMachineType = machineTypeList?.find(
    item => item.machineType === machineTypeSelected
  );
  /**
   * Disable the create button when the mandatory fields are not filled and the validations is not proper.
   */
  const isSaveDisabled = () => {
    return (
      !selectedMachineType ||
      jobNameSelected === '' ||
      jobNameSpecialValidation ||
      region === null ||
      creatingVertexScheduler ||
      machineTypeSelected === null ||
      (acceleratorType && !acceleratedCount) ||
      kernelSelected === null ||
      cloudStorage === null ||
      serviceAccountSelected === null ||
      (networkSelected === 'networkInThisProject' &&
        subNetworkSelected &&
        (primaryNetworkSelected === null ||
          primaryNetworkSelected === undefined)) ||
      (scheduleMode === 'runSchedule' &&
        ((internalScheduleMode === 'cronFormat' &&
          (scheduleField === '' || scheduleField === everyMinuteCron)) ||
          (internalScheduleMode === 'userFriendly' &&
            scheduleValue === everyMinuteCron))) ||
      inputFileSelected === '' ||
      endDateError ||
      isPastEndDate ||
      isPastStartDate ||
      diskSizeFlag ||
      !diskTypeSelected
    );
  };

  /**
   * Handles the schedule mode for the schedule_value field
   */
  const getScheduleValues = () => {
    if (scheduleMode === 'runNow') {
      return '';
    }
    if (
      scheduleMode === 'runSchedule' &&
      internalScheduleMode === 'cronFormat'
    ) {
      return scheduleField;
    }
    if (
      scheduleMode === 'runSchedule' &&
      internalScheduleMode === 'userFriendly'
    ) {
      return scheduleValue;
    }
  };

  /**
   * Create a job schedule
   */
  const handleCreateJobScheduler = async () => {
    const payload: ICreatePayload = {
      input_filename: inputFileSelected,
      display_name: jobNameSelected,
      machine_type: machineTypeSelected,
      kernel_name: kernelSelected,
      schedule_value: getScheduleValues(),
      time_zone: timeZoneSelected,
      max_run_count: scheduleMode === 'runNow' ? '1' : maxRuns,
      region: region,
      cloud_storage_bucket: `gs://${cloudStorage}`,
      service_account: serviceAccountSelected?.email,
      network:
        networkSelected === 'networkInThisProject'
          ? editMode
            ? primaryNetworkSelected?.link
            : primaryNetworkSelected?.link.split('/v1/')[1]
          : sharedNetworkSelected?.network.split('/v1/')[1],
      subnetwork:
        networkSelected === 'networkInThisProject'
          ? editMode
            ? subNetworkSelected?.link
            : subNetworkSelected?.link.split('/v1/')[1]
          : sharedNetworkSelected?.subnetwork.split('/v1/')[1],
      start_time: startDate,
      end_time: endDate,
      disk_type: diskTypeSelected,
      disk_size: diskSize,
      parameters: [] // Parameters for future scope
    };

    if (acceleratorType && acceleratedCount) {
      payload.accelerator_type = acceleratorType;
      payload.accelerator_count = acceleratedCount;
    }
    if (editMode) {
      await VertexServices.editVertexJobSchedulerService(
        jobId,
        region,
        payload,
        setCreateCompleted,
        setCreatingVertexScheduler,
        gcsPath,
        setEditMode,
        setCreateMode
      );
    } else {
      await VertexServices.createVertexSchedulerService(
        payload,
        setCreateCompleted,
        setCreatingVertexScheduler,
        setCreateMode
      );
      setEditMode(false);
    }
  };

  /**
   * Cancel a job schedule
   */
  const handleCancel = () => {
    if (!editMode) {
      setCreateCompleted(false);
      app.shell.activeWidget?.close();
    } else {
      setCreateCompleted(true);
    }
    setEditMode(false);
    setVertexSchedulerDetails(null); // reset the values once loaded so as to accept new values.
  };

  useEffect(() => {
    if (!editMode) {
      const defaultServiceAccount = serviceAccountList?.find(option => {
        if (option.email.split('-').includes(DEFAULT_SERVICE_ACCOUNT)) {
          return {
            displaName: option.displayName,
            email: option.displayName
          };
        }
      });
      setServiceAccountSelected(defaultServiceAccount!);
    }
  }, [serviceAccountList.length > 0]);

  useEffect(() => {
    setLoaderRegion(true);

    if (Object.keys(hostProject).length > 0) {
      sharedNetworkAPI();
    }

    if (!createCompleted) {
      hostProjectAPI();
      cloudStorageAPI();
      serviceAccountAPI();
      primaryNetworkAPI();

      authApi()
        .then(credentials => {
          if (credentials?.region_id && credentials?.project_id) {
            setLoaderRegion(false);
            setRegion(credentials.region_id);
            setProjectId(credentials.project_id);
          }
        })
        .catch(error => {
          handleErrorToast({
            error: error
          });
        });
    }

    if (!editMode) {
      setStartDate(null);
      setEndDate(null);
    }
  }, []);

  useEffect(() => {
    if (!createCompleted) {
      authApi()
        .then(credentials => {
          if (credentials?.region_id && credentials?.project_id) {
            setProjectId(credentials.project_id);
          }
        })
        .catch(error => {
          handleErrorToast({
            error: error
          });
        });
    }

    if (editMode && vertexSchedulerDetails) {
      setJobId(vertexSchedulerDetails.job_id ?? '');
      setInputFileSelected(vertexSchedulerDetails.input_filename);
      setJobNameSelected(vertexSchedulerDetails.display_name);
      if (vertexSchedulerDetails?.machine_type) {
        const matchedMachine = machineTypeList.find(item =>
          item.machineType.includes(vertexSchedulerDetails?.machine_type ?? '')
        );
        if (matchedMachine) {
          setMachineTypeSelected(matchedMachine.machineType);
        }
      }
      setKernelSelected(vertexSchedulerDetails.kernel_name);
      setAcceleratorType(vertexSchedulerDetails.accelerator_type ?? null);
      setAcceleratedCount(vertexSchedulerDetails.accelerator_count ?? null);
      setMaxRuns(vertexSchedulerDetails.max_run_count ?? '');
      setCloudStorage(vertexSchedulerDetails.cloud_storage_bucket);
      setRegion(vertexSchedulerDetails.region);
      setServiceAccountSelected(vertexSchedulerDetails.service_account);
      setPrimaryNetworkSelected(vertexSchedulerDetails.network);
      setSubNetworkSelected(vertexSchedulerDetails.subnetwork);
      setSharedNetworkSelected(vertexSchedulerDetails.shared_network);
      setStartDate(vertexSchedulerDetails.start_time);
      setEndDate(vertexSchedulerDetails.end_time);
      setScheduleField(vertexSchedulerDetails.cron ?? '');
      setScheduleValue(vertexSchedulerDetails.cron ?? '');
      setTimeZoneSelected(
        vertexSchedulerDetails.time_zone ??
          Intl.DateTimeFormat().resolvedOptions().timeZone
      );
      setScheduleMode(vertexSchedulerDetails.scheduleMode ?? 'runNow');
      setDiskTypeSelected(vertexSchedulerDetails.disk_type);
      setDiskSize(vertexSchedulerDetails.disk_size);
      setGcsPath(vertexSchedulerDetails.gcs_notebook_source ?? '');
    }
  }, [editMode]);

  useEffect(() => {
    if (editMode && projectId) {
      const primaryNetworkLink = vertexSchedulerDetails?.network.link;
      // eslint-disable-next-line no-useless-escape
      const projectInNetwork = primaryNetworkLink?.match(/projects\/([^\/]+)/);
      if (projectInNetwork?.[1]) {
        if (projectInNetwork[1] === projectId) {
          setNetworkSelected('networkInThisProject');
        } else {
          setNetworkSelected('networkShared');
        }
      }
      setVertexSchedulerDetails(null);
    }
  }, [editMode, projectId]);

  useEffect(() => {
    if (!region) {
      setMachineTypeList([]);
      setMachineTypeSelected(null);
    } else {
      machineTypeAPI();
      if (!createCompleted) {
        subNetworkAPI(primaryNetworkSelected?.name);
      }
    }
  }, [region]);

  useEffect(() => {
    if (
      networkSelected === 'networkShared' &&
      Object.keys(hostProject).length !== 0
    ) {
      sharedNetworkAPI();
    }
  }, [networkSelected, region]);

  useEffect(() => {
    if (!newBucketOption) {
      setCloudStorage(
        cloudStorageList.find(
          option => option === DEFAULT_CLOUD_STORAGE_BUCKET
        ) || null
      );
    }
  }, [cloudStorageList]);

  useEffect(() => {
    const machineTypeOptions = machineTypeList.map(item => item.machineType);
    setMachineTypeSelected(
      machineTypeOptions.find(option => option === DEFAULT_MACHINE_TYPE) || null
    );
  }, [machineTypeList]);

  useEffect(() => {
    if (
      Number(diskSize) >= DEFAULT_DISK_MIN_SIZE &&
      Number(diskSize) <= DEFAULT_DISK_MAX_SIZE
    ) {
      setDiskSizeFlag(false);
    } else {
      setDiskSizeFlag(true);
    }
  }, [diskSize]);

  return (
    <>
      {createCompleted ? (
        <VertexScheduleJobs
          app={app}
          themeManager={themeManager}
          createCompleted={createCompleted}
          setCreateCompleted={setCreateCompleted}
          region={region}
          setRegion={setRegion}
          setSubNetworkList={setSubNetworkList}
          setEditMode={setEditMode}
          setJobNameSelected={setJobNameSelected}
          setExecutionPageFlag={setExecutionPageFlag}
          setIsApiError={setIsApiError}
          setApiError={setApiError}
          setExecutionPageListFlag={setExecutionPageListFlag}
          setVertexScheduleDetails={setVertexSchedulerDetails}
          setApiEnableUrl={setApiEnableUrl}
          setListingScreenFlag={setListingScreenFlag}
          createMode={createMode}
        />
      ) : (
        <div className="submit-job-container text-enable-warning">
          <div className="create-scheduler-form-element">
            <RegionDropdown
              projectId={projectId}
              region={region}
              onRegionChange={region => handleRegionChange(region)}
              editMode={editMode}
              regionsList={VERTEX_REGIONS}
              fromPage={VERTEX_SCHEDULE}
              loaderRegion={loaderRegion}
            />
          </div>
          {!region && (
            <ErrorMessage message="Region is required" showIcon={false} />
          )}

          <div className="create-scheduler-form-element">
            <Autocomplete
              className="create-scheduler-style"
              options={machineTypeList?.map(item => item.machineType)}
              value={machineTypeSelected}
              onChange={(_event, val) => handleMachineType(val)}
              renderInput={params => (
                <TextField
                  {...params}
                  label="Machine type*"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {machineTypeLoading && !machineTypeSelected ? (
                          <CircularProgress
                            aria-label="Loading Spinner"
                            data-testid="loader"
                            size={18}
                          />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    )
                  }}
                />
              )}
              clearIcon={false}
              loading={machineTypeLoading}
              disabled={!region}
            />
          </div>

          {!machineTypeSelected && !apiError && region && (
            <ErrorMessage message="Machine type is required" showIcon={false} />
          )}

          {!machineTypeSelected && apiError && !isApiError && (
            <ErrorMessage message={apiError} showIcon={false} />
          )}

          {machineTypeList.length > 0 &&
            machineTypeList.map(item => {
              if (
                ('acceleratorConfigs' in item &&
                  item.machineType === machineTypeSelected &&
                  item.acceleratorConfigs !== null) ||
                ('acceleratorConfigs' in item &&
                  machineTypeSelected &&
                  item.machineType.split(' ')[0] === machineTypeSelected &&
                  item.acceleratorConfigs !== null)
              ) {
                return (
                  <div className="execution-history-main-wrapper">
                    <div className="create-scheduler-form-element create-scheduler-form-element-input-fl create-pr">
                      <Autocomplete
                        className="create-scheduler-style create-scheduler-form-element-input-fl"
                        options={getAcceleratedType(item.acceleratorConfigs)}
                        value={acceleratorType}
                        onChange={(_event, val) => handleAccelerationType(val)}
                        renderInput={params => (
                          <TextField {...params} label="Accelerator type" />
                        )}
                      />
                    </div>

                    {item?.acceleratorConfigs?.map(
                      (element: {
                        allowedCounts: number[];
                        acceleratorType: string;
                      }) => {
                        return (
                          <>
                            {element.acceleratorType === acceleratorType ? (
                              <div className="create-scheduler-form-element create-scheduler-form-element-input-fl">
                                <Autocomplete
                                  className="create-scheduler-style create-scheduler-form-element-input-fl"
                                  options={element.allowedCounts.map(item =>
                                    item.toString()
                                  )}
                                  value={acceleratedCount}
                                  onChange={(_event, val) =>
                                    handleAcceleratorCount(val)
                                  }
                                  renderInput={params => (
                                    <TextField
                                      {...params}
                                      label="Accelerator count*"
                                    />
                                  )}
                                />
                                {!acceleratedCount && (
                                  <ErrorMessage
                                    message="Accelerator count is required"
                                    showIcon={false}
                                  />
                                )}
                              </div>
                            ) : null}
                          </>
                        );
                      }
                    )}
                  </div>
                );
              }
            })}

          <div className="create-scheduler-form-element">
            <Autocomplete
              className="create-scheduler-style"
              options={KERNEL_VALUE}
              value={kernelSelected}
              onChange={(_event, val) => handleKernel(val)}
              renderInput={params => <TextField {...params} label="Kernel*" />}
              clearIcon={false}
            />
          </div>
          {!kernelSelected && (
            <ErrorMessage message="Kernel is required" showIcon={false} />
          )}

          <div className="create-scheduler-form-element">
            <Autocomplete
              className="create-scheduler-style"
              options={cloudStorageList}
              value={cloudStorage}
              onChange={(_event, val) => handleCloudStorageSelected(val)}
              onInputChange={handleSearchChange}
              filterOptions={filterOptions}
              renderInput={params => (
                <TextField
                  {...params}
                  label="Cloud Storage Bucket*"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isCreatingNewBucket ? (
                          <CircularProgress
                            aria-label="Loading Spinner"
                            data-testid="loader"
                            size={18}
                          />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    )
                  }}
                />
              )}
              clearIcon={false}
              loading={cloudStorageLoading}
              getOptionLabel={option => option}
              renderOption={(props, option) => {
                // Custom rendering for the "Create new bucket" option
                if (option === 'Create and Select') {
                  return (
                    <li {...props} className="custom-add-bucket">
                      {option}
                    </li>
                  );
                }

                return <li {...props}>{option}</li>;
              }}
              disabled={isCreatingNewBucket}
            />
          </div>
          {!cloudStorage && !errorMessageBucket && (
            <ErrorMessage
              message="Cloud storage bucket is required"
              showIcon={false}
            />
          )}

          <span className="tab-description tab-text-sub-cl">
            {errorMessageBucket ? (
              <div className="error-message-warn error-key-missing">
                {errorMessageBucket}
              </div>
            ) : bucketError &&
              bucketError !== '' &&
              !cloudStorageList.includes(cloudStorage!) ? (
              <span className="error-message">{bucketError}</span>
            ) : (
              <span>Select an existing bucket or create a new one.</span>
            )}
          </span>
          <div className="execution-history-main-wrapper">
            <div className="create-scheduler-form-element create-scheduler-form-element-input-fl create-pr">
              <Autocomplete
                className="create-scheduler-style create-scheduler-form-element-input-fl"
                options={DISK_TYPE_VALUE}
                value={diskTypeSelected}
                onChange={(_event, val) => handleDiskType(val)}
                renderInput={params => (
                  <TextField {...params} label="Disk Type" />
                )}
                clearIcon={false}
              />
              {!diskTypeSelected && (
                <ErrorMessage
                  message="Disk type is required"
                  showIcon={false}
                  errorWidth={true}
                />
              )}
            </div>
            <div className="create-scheduler-form-element create-scheduler-form-element-input-fl create-pr">
              <Input
                className="create-scheduler-style create-scheduler-form-element-input-fl"
                value={diskSize}
                onChange={e => handleDiskSize(e)}
                onBlur={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleDefaultDiskSize(e)
                }
                type="number"
                placeholder=""
                Label="Disk Size (in GB)"
              />
              {diskSizeFlag && (
                <ErrorMessage
                  message="Disk size should be within the range of [10 - 65536]"
                  showIcon={false}
                  errorWidth={true}
                />
              )}
            </div>
          </div>

          <div className="create-scheduler-form-element panel-margin footer-text">
            <Autocomplete
              className="create-scheduler-style-trigger"
              options={serviceAccountList}
              getOptionLabel={option => option.displayName}
              value={
                serviceAccountList.find(
                  option => option.email === serviceAccountSelected?.email
                ) || null
              }
              clearIcon={false}
              loading={serviceAccountLoading}
              onChange={(_event, val) => handleServiceAccountChange(val)}
              renderInput={params => (
                <TextField {...params} label="Service account*" />
              )}
              renderOption={(props, option) => (
                <Box
                  component="li"
                  {...props}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start'
                  }}
                >
                  <Typography variant="body1">{option.displayName}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {option.email}
                  </Typography>
                </Box>
              )}
            />
          </div>
          {!serviceAccountSelected && !errorMessageServiceAccount && (
            <ErrorMessage
              message="Service account is required"
              showIcon={false}
            />
          )}

          {errorMessageServiceAccount && (
            <span className="error-message-warn error-key-missing">
              {errorMessageServiceAccount}
            </span>
          )}

          <div className="create-job-scheduler-text-para create-job-scheduler-sub-title">
            Network Configuration
          </div>

          <p>Establishes connectivity for VM instances in the cluster</p>

          <div className="create-scheduler-form-element panel-margin">
            <FormControl>
              <RadioGroup
                aria-labelledby="demo-controlled-radio-buttons-group"
                name="controlled-radio-buttons-group"
                value={networkSelected}
                onChange={handleNetworkSelection}
                data-testid={
                  networkSelected === 'networkInThisProject'
                    ? 'networkInThisProject-selected'
                    : 'networkShared-selected'
                }
              >
                <FormControlLabel
                  value="networkInThisProject"
                  className="create-scheduler-label-style"
                  control={<Radio size="small" />}
                  disabled={editMode}
                  label={
                    <Typography sx={{ fontSize: 13 }}>
                      Network in this project
                    </Typography>
                  }
                />
                <FormControlLabel
                  value="networkShared"
                  className="create-scheduler-label-style"
                  control={<Radio size="small" />}
                  disabled={editMode}
                  label={
                    <Typography sx={{ fontSize: 13 }}>
                      Network shared from host project
                      {` ${Object.keys(hostProject).length !== 0 ? `"${hostProject?.name}"` : ''}`}
                    </Typography>
                  }
                />
                <span className="sub-para tab-text-sub-cl">
                  Choose a shared VPC network from the project that is different
                  from the clusters project
                </span>
                <div className="learn-more-a-tag learn-more-url">
                  <LearnMore path={SHARED_NETWORK_DOC_URL} />
                </div>
              </RadioGroup>
            </FormControl>
          </div>

          {/* Network in this project  */}
          {networkSelected === 'networkInThisProject' ? (
            <div className="execution-history-main-wrapper">
              <div className="create-scheduler-form-element create-scheduler-form-element-input-fl create-pr">
                <Autocomplete
                  className="create-scheduler-style create-scheduler-form-element-input-fl"
                  options={primaryNetworkList}
                  getOptionLabel={option => option.name}
                  value={primaryNetworkSelected}
                  onChange={(_event, val) => handlePrimaryNetwork(val)}
                  renderInput={params => (
                    <TextField
                      {...params}
                      label="Primary network"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {primaryNetworkLoading ? (
                              <CircularProgress
                                aria-label="Loading Spinner"
                                data-testid="loader"
                                size={18}
                              />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </>
                        )
                      }}
                    />
                  )}
                  clearIcon={false}
                  disabled={editMode}
                />
                {errorMessagePrimaryNetwork && (
                  <ErrorMessage
                    message={errorMessagePrimaryNetwork}
                    showIcon={false}
                  />
                )}
              </div>
              <div className="create-scheduler-form-element create-scheduler-form-element-input-fl">
                <Autocomplete
                  className="create-scheduler-style create-scheduler-form-element-input-fl"
                  options={subNetworkList}
                  getOptionLabel={option => option.name}
                  value={subNetworkSelected}
                  onChange={(_event, val) => handleSubNetwork(val)}
                  renderInput={params => (
                    <TextField
                      {...params}
                      label="Sub network"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {subNetworkLoading ? (
                              <CircularProgress
                                aria-label="Loading Spinner"
                                data-testid="loader"
                                size={18}
                              />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </>
                        )
                      }}
                    />
                  )}
                  clearIcon={false}
                  disabled={editMode || !primaryNetworkSelected}
                  noOptionsText={
                    <span className="network-option-helper-text">
                      {SUBNETWORK_VERTEX_ERROR}
                    </span>
                  }
                />
                {errorMessageSubnetworkNetwork && (
                  <ErrorMessage
                    message={errorMessageSubnetworkNetwork}
                    showIcon={false}
                  />
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Network shared from host project */}
              <div className="create-scheduler-form-element">
                <Autocomplete
                  className="create-scheduler-style"
                  options={sharedNetworkList}
                  getOptionLabel={option => option.name}
                  value={
                    sharedNetworkList.find(
                      option => option.name === sharedNetworkSelected?.name
                    ) || null
                  }
                  onChange={(_event, val) => handleSharedNetwork(val)}
                  renderInput={params => (
                    <TextField {...params} label="Shared subnetwork*" />
                  )}
                  clearIcon={false}
                  loading={sharedNetworkLoading}
                  disabled={Object.keys(hostProject).length === 0}
                />
              </div>
              {(Object.keys(hostProject).length === 0 ||
                sharedNetworkList.length === 0) && (
                <ErrorMessage
                  message="No shared subnetworks are available in this region."
                  showIcon={false}
                />
              )}
            </>
          )}
          <div className="create-scheduler-label">Schedule</div>
          <div className="create-scheduler-form-element">
            <FormControl>
              <RadioGroup
                aria-labelledby="demo-controlled-radio-buttons-group"
                name="controlled-radio-buttons-group"
                value={scheduleMode}
                onChange={handleSchedulerModeChange}
                data-testid={
                  scheduleMode === 'runNow'
                    ? 'runNow-selected'
                    : 'runSchedule-selected'
                }
              >
                <FormControlLabel
                  value="runNow"
                  className="create-scheduler-label-style"
                  control={<Radio size="small" />}
                  label={<Typography sx={{ fontSize: 13 }}>Run now</Typography>}
                  disabled={editMode && scheduleMode === 'runSchedule'}
                />
                <FormControlLabel
                  value="runSchedule"
                  className="create-scheduler-label-style"
                  control={<Radio size="small" />}
                  label={
                    <Typography sx={{ fontSize: 13 }}>
                      Run on a schedule
                    </Typography>
                  }
                  disabled={editMode && scheduleMode === 'runNow'}
                />
              </RadioGroup>
            </FormControl>
          </div>
          <div className="schedule-child-section">
            {scheduleMode === 'runSchedule' && (
              <div className="create-scheduler-radio-element">
                <FormControl>
                  <RadioGroup
                    aria-labelledby="demo-controlled-radio-buttons-group"
                    name="controlled-radio-buttons-group"
                    value={internalScheduleMode}
                    onChange={handleInternalSchedulerModeChange}
                    data-testid={
                      internalScheduleMode === 'cronFormat'
                        ? 'cronFormat-selected'
                        : 'userFriendly-selected'
                    }
                  >
                    <FormControlLabel
                      value="cronFormat"
                      className="create-scheduler-label-style"
                      control={<Radio size="small" />}
                      label={
                        <Typography sx={{ fontSize: 13 }}>
                          Use UNIX cron format
                        </Typography>
                      }
                    />
                    <FormControlLabel
                      value="userFriendly"
                      className="create-scheduler-label-style"
                      control={<Radio size="small" />}
                      label={
                        <Typography sx={{ fontSize: 13 }}>
                          Use user-friendly scheduler
                        </Typography>
                      }
                    />
                  </RadioGroup>
                </FormControl>
              </div>
            )}
            {scheduleMode === 'runSchedule' && (
              <div className="execution-history-main-wrapper">
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <div className="create-scheduler-form-element create-scheduler-form-element-input-fl create-pr">
                    <DateTimePicker
                      className="create-scheduler-style create-scheduler-form-element-input-fl"
                      label="Start Date"
                      value={startDate}
                      onChange={newValue => handleStartDate(newValue)}
                      slots={{
                        openPickerIcon: CalendarMonthIcon
                      }}
                      slotProps={{
                        actionBar: {
                          actions: ['clear']
                        },
                        tabs: {
                          hidden: true
                        },
                        textField: {
                          error: false
                        }
                      }}
                      disablePast
                      closeOnSelect={true}
                      viewRenderers={{
                        hours: renderTimeViewClock,
                        minutes: renderTimeViewClock,
                        seconds: renderTimeViewClock
                      }}
                    />
                    {isPastStartDate && (
                      <ErrorMessage
                        message="Start date should be greater than current date"
                        showIcon={false}
                      />
                    )}
                  </div>
                  <div className="create-scheduler-form-element create-scheduler-form-element-input-fl create-pr">
                    <DateTimePicker
                      className="create-scheduler-style create-scheduler-form-element-input-fl"
                      label="End Date"
                      value={endDate}
                      onChange={newValue => handleEndDate(newValue)}
                      slots={{
                        openPickerIcon: CalendarMonthIcon
                      }}
                      slotProps={{
                        actionBar: {
                          actions: ['clear']
                        },
                        field: { clearable: true },
                        tabs: {
                          hidden: true
                        },
                        textField: {
                          error: false
                        }
                      }}
                      disablePast
                      closeOnSelect={true}
                      viewRenderers={{
                        hours: renderTimeViewClock,
                        minutes: renderTimeViewClock,
                        seconds: renderTimeViewClock
                      }}
                    />
                    {endDateError && (
                      <ErrorMessage
                        message="End date should be greater than Start date"
                        showIcon={false}
                      />
                    )}
                    {isPastEndDate && (
                      <ErrorMessage
                        message="End date should be greater than current date"
                        showIcon={false}
                      />
                    )}
                  </div>
                </LocalizationProvider>
              </div>
            )}
            {scheduleMode === 'runSchedule' &&
              internalScheduleMode === 'cronFormat' && (
                <div className="create-scheduler-form-element schedule-input-field">
                  <Input
                    className="create-scheduler-style"
                    value={scheduleField}
                    onChange={e => handleSchedule(e)}
                    type="text"
                    placeholder=""
                    Label="Schedule*"
                  />
                  {scheduleField === '' && (
                    <ErrorMessage
                      message="Schedule field is required"
                      showIcon={false}
                    />
                  )}
                  {scheduleField === everyMinuteCron && (
                    <ErrorMessage
                      message="Every minute cron expression not supported"
                      showIcon={false}
                    />
                  )}
                  <div>
                    <span className="tab-description tab-text-sub-cl">
                      Schedules are specified using unix-cron format. E.g. every
                      3 hours: "0 */3 * * *", every Monday at 9:00: "0 9 * * 1".
                    </span>
                    <div className="learn-more-url">
                      <LearnMore path={CORN_EXP_DOC_URL} />
                    </div>
                  </div>
                </div>
              )}
            {scheduleMode === 'runSchedule' &&
              internalScheduleMode === 'userFriendly' && (
                <>
                  <div className="create-scheduler-form-element">
                    <Cron
                      value={scheduleValue}
                      setValue={setScheduleValue}
                      allowedPeriods={
                        allowedPeriodsCron as PeriodType[] | undefined
                      }
                    />
                  </div>
                  <div>
                    {scheduleValue === everyMinuteCron && (
                      <ErrorMessage
                        message="Every minute cron expression not supported"
                        showIcon={false}
                      />
                    )}
                  </div>
                </>
              )}
            {scheduleMode === 'runSchedule' && (
              <>
                <div className="create-scheduler-form-element">
                  <Autocomplete
                    className="create-scheduler-style"
                    options={timezones}
                    value={timeZoneSelected}
                    onChange={(_event, val) => handleTimeZoneSelected(val)}
                    renderInput={params => (
                      <TextField {...params} label="Time Zone*" />
                    )}
                    clearIcon={false}
                  />
                </div>
                <div className="create-scheduler-form-element">
                  <Input
                    className="create-scheduler-style"
                    value={maxRuns}
                    onChange={e => handleMaxRuns(e)}
                    type="number"
                    placeholder=""
                    Label="Max runs"
                  />
                </div>
              </>
            )}
          </div>
          <div className="save-overlay">
            <Button
              onClick={() => handleCreateJobScheduler()}
              variant="contained"
              aria-label={editMode ? ' Update Schedule' : 'Create Schedule'}
              disabled={isSaveDisabled()}
            >
              <div>
                {editMode
                  ? creatingVertexScheduler
                    ? 'UPDATING'
                    : 'UPDATE'
                  : creatingVertexScheduler
                    ? 'CREATING'
                    : 'CREATE'}
              </div>
            </Button>
            <Button
              variant="outlined"
              aria-label="cancel Batch"
              disabled={creatingVertexScheduler}
              onClick={!creatingVertexScheduler ? handleCancel : undefined}
            >
              <div>CANCEL</div>
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateVertexScheduler;
