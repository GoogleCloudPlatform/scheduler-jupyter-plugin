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
import { Input } from '../../controls/MuiWrappedInput';
import {
  Autocomplete,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  Button,
  Box
} from '@mui/material';
import { MuiChipsInput } from 'mui-chips-input';
import { IThemeManager } from '@jupyterlab/apputils';
import { JupyterLab } from '@jupyterlab/application';
import LabelProperties from '../../jobs/LabelProperties';
import { v4 as uuidv4 } from 'uuid';
import { Cron } from 'react-js-cron';
import 'react-js-cron/dist/styles.css';
import { KernelSpecAPI } from '@jupyterlab/services';
import tzdata from 'tzdata';
import { SchedulerService } from '../../services/SchedulerServices';
import NotebookJobComponent from './NotebookJobs';
import {
  composerEnvironmentStateListForCreate,
  packages,
  scheduleMode,
  scheduleValueExpression
} from '../../utils/Const';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import ErrorMessage from '../common/ErrorMessage';
import { IComposerAPIResponse, IDagList } from '../common/SchedulerInteface';
import { DynamicDropdown } from '../../controls/DynamicDropdown';
import { projectListAPI } from '../../services/ProjectService';
import { RegionDropdown } from '../../controls/RegionDropdown';
import { authApi, findEnvironmentSelected } from '../../utils/Config';
import { iconSuccess, iconWarning } from '../../utils/Icons';
import { ProgressPopUp } from '../../utils/ProgressPopUp';
import { toast } from 'react-toastify';

const CreateNotebookScheduler = ({
  themeManager,
  app,
  context,
  settingRegistry,
  createCompleted,
  setCreateCompleted,
  jobNameSelected,
  setJobNameSelected,
  inputFileSelected,
  setInputFileSelected,
  editMode,
  setEditMode,
  jobNameValidation,
  jobNameSpecialValidation,
  jobNameUniqueValidation,
  setJobNameUniqueValidation,
  setIsApiError,
  setApiError,
  setExecutionPageFlag,
  isLocalKernel,
  setIsLocalKernel,
  packageEditFlag,
  setPackageEditFlag,
  setSchedulerBtnDisable,
  abortControllerRef,
  setApiEnableUrl,
  jobNameUniquenessError,
  setJobNameUniquenessError
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
  jobNameValidation: boolean;
  jobNameSpecialValidation: boolean;
  jobNameUniqueValidation: boolean;
  setJobNameUniqueValidation: React.Dispatch<React.SetStateAction<boolean>>;
  setIsApiError: React.Dispatch<React.SetStateAction<boolean>>;
  setApiError: React.Dispatch<React.SetStateAction<string>>;
  setExecutionPageFlag: React.Dispatch<React.SetStateAction<boolean>>;
  isLocalKernel: boolean;
  setIsLocalKernel: React.Dispatch<React.SetStateAction<boolean>>;
  packageEditFlag: boolean;
  setPackageEditFlag: React.Dispatch<React.SetStateAction<boolean>>;
  setSchedulerBtnDisable: React.Dispatch<React.SetStateAction<boolean>>;
  abortControllerRef: any;
  setApiEnableUrl: any;
  jobNameUniquenessError: boolean;
  setJobNameUniquenessError: React.Dispatch<React.SetStateAction<boolean>>;
}): JSX.Element => {
  const [composerEnvData, setComposerEnvData] = useState<
    IComposerAPIResponse[]
  >([]);
  const [composerEnvSelected, setComposerEnvSelected] =
    useState<IComposerAPIResponse | null>(null);

  const [parameterDetail, setParameterDetail] = useState(['']);
  const [parameterDetailUpdated, setParameterDetailUpdated] = useState(['']);
  const [keyValidation, setKeyValidation] = useState(-1);
  const [valueValidation, setValueValidation] = useState(-1);
  const [duplicateKeyError, setDuplicateKeyError] = useState(-1);

  const [selectedMode, setSelectedMode] = useState('cluster');
  const [clusterList, setClusterList] = useState<string[]>([]);
  const [serverlessList, setServerlessList] = useState<string[]>([]);
  const [serverlessDataList, setServerlessDataList] = useState<string[]>([]);
  const [clusterSelected, setClusterSelected] = useState('');
  const [serverlessSelected, setServerlessSelected] = useState('');
  const [serverlessDataSelected, setServerlessDataSelected] = useState({});
  const [stopCluster, setStopCluster] = useState(false);

  const [retryCount, setRetryCount] = useState<number | undefined>(2);
  const [retryDelay, setRetryDelay] = useState<number | undefined>(5);
  const [emailOnFailure, setEmailOnFailure] = useState(false);
  const [emailOnRetry, setEmailOnRetry] = useState(false);
  const [emailOnSuccess, setEmailOnSuccess] = useState(false);
  const [emailList, setEmailList] = useState<string[]>([]);
  const [emailError, setEmailError] = useState<boolean>(false);

  const [scheduleMode, setScheduleMode] = useState<scheduleMode>('runNow');
  const [scheduleValue, setScheduleValue] = useState(scheduleValueExpression);
  const [timeZoneSelected, setTimeZoneSelected] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  const timezones = Object.keys(tzdata.zones).sort();

  const [creatingScheduler, setCreatingScheduler] = useState(false);
  const [dagList, setDagList] = useState<IDagList[]>([]);
  const [dagListCall, setDagListCall] = useState(false);
  const [isLoadingKernelDetail, setIsLoadingKernelDetail] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [region, setRegion] = useState<string>('');
  const [packageInstallationMessage, setPackageInstallationMessage] =
    useState<string>('');
  const [packageInstalledList, setPackageInstalledList] = useState<string[]>(
    []
  );
  const [clusterFlag, setClusterFlag] = useState<boolean>(false);
  const [envApiFlag, setEnvApiFlag] = useState<boolean>(false);
  const [loaderRegion, setLoaderRegion] = useState<boolean>(false);
  const [loaderProjectId, setLoaderProjectId] = useState<boolean>(false);
  const [packageInstalledMessage, setPackageInstalledMessage] =
    useState<string>('');
  const [envUpdateState, setEnvUpdateState] = useState<boolean>(false);

  const listClustersAPI = async () => {
    await SchedulerService.listClustersAPIService(
      setClusterList,
      setIsLoadingKernelDetail
    );
  };

  const listSessionTemplatesAPI = async () => {
    await SchedulerService.listSessionTemplatesAPIService(
      setServerlessDataList,
      setServerlessList,
      setIsLoadingKernelDetail
    );
  };

  const listComposersAPI = async () => {
    setEnvApiFlag(true);
    await SchedulerService.listComposersAPIService(
      setComposerEnvData,
      projectId,
      region,
      setIsApiError,
      setApiError,
      setApiEnableUrl,
      setEnvApiFlag
    );
  };

  const getComposerEnvAPI = async () => {
    return await SchedulerService.getComposerEnvApiService(
      composerEnvSelected?.metadata?.path
    );
  };

  const checkRequiredPackages = (env: IComposerAPIResponse | null) => {
    const packages_from_env = env?.pypi_packages;
    const missingPackages = packages_from_env
      ? packages.filter(
          pkg => !Object.prototype.hasOwnProperty.call(packages_from_env, pkg)
        )
      : packages.slice(); // If packages_from_env is falsy, all are missing

    if (missingPackages.length === 0) {
      setPackageInstalledMessage('Required packages are already installed');
    } else {
      setPackageInstallationMessage(
        missingPackages.join(', ') +
          ' will get installed on creation of schedule'
      );
      setPackageInstalledList(missingPackages);
    }
  };

  const handleComposerEnvSelected = (data: IComposerAPIResponse | null) => {
    setPackageInstalledMessage('');
    setPackageInstalledList([]);
    setPackageInstallationMessage('');

    if (data) {
      const selectedEnvironment = findEnvironmentSelected(
        data.name,
        composerEnvData
      );

      if (selectedEnvironment) {
        if (isLocalKernel) {
          checkRequiredPackages(selectedEnvironment);
        }
        setComposerEnvSelected(selectedEnvironment);
      }

      if (selectedEnvironment?.name) {
        const unique = getDaglist(selectedEnvironment?.name);
        if (!unique) {
          setJobNameUniqueValidation(true);
        }
      }
    }
  };

  const getDaglist = (composer: string) => {
    setDagListCall(true);
    try {
      SchedulerService.listDagInfoAPIServiceForCreateNotebook(
        setDagList,
        composer,
        setJobNameUniquenessError,
        region,
        projectId
      );
      setDagListCall(false);
      return true;
    } catch (error) {
      setDagListCall(false);
      console.error('Error checking job name uniqueness:', error);
      return false;
    }
  };

  const handleSelectedModeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if ((event.target as HTMLInputElement).value === 'cluster') {
      setClusterFlag(true);
    }
    setSelectedMode((event.target as HTMLInputElement).value);
  };

  const handleSchedulerModeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = (event.target as HTMLInputElement).value;
    setScheduleMode(newValue as scheduleMode);
    if (newValue === 'runSchedule' && scheduleValue === '') {
      setScheduleValue(scheduleValueExpression);
    }
  };

  const handleClusterSelected = (data: string | null) => {
    if (data) {
      const selectedCluster = data.toString();
      setClusterSelected(selectedCluster);
    }
  };

  const handleTimeZoneSelected = (data: string | null) => {
    if (data) {
      const selectedTimeZone = data.toString();
      setTimeZoneSelected(selectedTimeZone);
    }
  };

  const handleServerlessSelected = (data: string | null) => {
    if (data) {
      const selectedServerless = data.toString();
      const selectedData: any = serverlessDataList.filter((serverless: any) => {
        return serverless.serverlessName === selectedServerless;
      });
      setServerlessDataSelected(selectedData[0].serverlessData);
      setServerlessSelected(selectedServerless);
    }
  };

  const handleStopCluster = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStopCluster(event.target.checked);
  };

  const handleRetryCount = (data: number) => {
    if (data >= 0) {
      setRetryCount(data);
    }
  };

  const handleRetryDelay = (data: number) => {
    if (data >= 0) {
      setRetryDelay(data);
    }
  };

  const handleFailureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmailOnFailure(event.target.checked);
    if (!event.target.checked) {
      setEmailError(false);
      setEmailList([]);
    }
  };

  const handleRetryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmailOnRetry(event.target.checked);
    if (!event.target.checked) {
      setEmailError(false);
      setEmailList([]);
    }
  };

  const handleSuccessChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmailOnSuccess(event.target.checked);
    if (!event.target.checked) {
      setEmailError(false);
      setEmailList([]);
    }
  };

  const handleEmailList = (data: string[]) => {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    let invalidEmail = false;
    data.forEach(email => {
      if (!emailPattern.test(email)) {
        invalidEmail = true;
        setEmailError(true);
      }
    });
    if (invalidEmail === false) {
      setEmailError(false);
    }
    setEmailList(data);
  };

  const handleCreateJobScheduler = async () => {
    const outputFormats = [];
    outputFormats.push('ipynb');

    const randomDagId = uuidv4();
    const payload = {
      input_filename: inputFileSelected,
      composer_environment_name: composerEnvSelected?.name ?? '',
      output_formats: outputFormats,
      parameters: parameterDetailUpdated,
      local_kernel: isLocalKernel,
      mode_selected: isLocalKernel ? '' : selectedMode,
      retry_count: retryCount,
      retry_delay: retryDelay,
      email_failure: emailOnFailure,
      email_delay: emailOnRetry,
      email_success: emailOnSuccess,
      email: emailList,
      name: jobNameSelected,
      schedule_value: scheduleMode === 'runNow' ? '' : scheduleValue,
      stop_cluster: stopCluster,
      dag_id: randomDagId,
      time_zone: scheduleMode !== 'runNow' ? timeZoneSelected : '',
      [selectedMode === 'cluster' ? 'cluster_name' : 'serverless_name']:
        selectedMode === 'cluster' ? clusterSelected : serverlessDataSelected
    };

    if (packageInstalledList.length > 0 && isLocalKernel) {
      payload['packages_to_install'] = packageInstalledList;
      toast(ProgressPopUp, {
        autoClose: false,
        closeButton: true,
        data: {
          message:
            'Installing packages taking longer than usual. Scheduled job starts post installation. Please wait....'
        }
      });
    }

    await SchedulerService.createJobSchedulerService(
      payload,
      app,
      setCreateCompleted,
      setCreatingScheduler,
      editMode,
      projectId,
      region,
      selectedMode,
      packageInstalledList,
      setPackageEditFlag
    );
    setEditMode(false);
  };

  const isSaveDisabled = () => {
    return (
      emailError ||
      dagListCall ||
      creatingScheduler ||
      (editMode && isLocalKernel && envUpdateState) || // Environment is updating
      jobNameSelected === '' ||
      (!jobNameValidation && !editMode) ||
      (jobNameSpecialValidation && !editMode) ||
      (!jobNameUniqueValidation && !editMode) ||
      (jobNameUniquenessError && !editMode) ||
      inputFileSelected === '' ||
      parameterDetailUpdated.some(
        item =>
          item.length === 1 ||
          (item.split(':')[0]?.length > 0 &&
            item.split(':')[1]?.length === 0) ||
          (item.split(':')[0]?.length === 0 && item.split(':')[1]?.length > 0)
      ) ||
      !composerEnvSelected ||
      (selectedMode === 'cluster' &&
        clusterSelected === '' &&
        !isLocalKernel) ||
      (selectedMode === 'serverless' &&
        serverlessSelected === '' &&
        !isLocalKernel) ||
      ((emailOnFailure || emailOnRetry || emailOnSuccess) &&
        emailList.length === 0)
    );
  };

  const handleCancel = async () => {
    if (!editMode) {
      setCreateCompleted(false);
      app.shell.activeWidget?.close();
    } else {
      setCreateCompleted(true);
      setEditMode(false);
      setPackageEditFlag(false);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  /**
   * Changing the region value and empyting the value of machineType, accelratorType and accelratorCount
   * @param {string} value selected region
   */
  const handleRegionChange = (value: React.SetStateAction<string>) => {
    setPackageInstalledList([]);
    setPackageInstallationMessage('');
    setComposerEnvSelected(null);
    setComposerEnvData([]);
    setPackageInstalledMessage('');
    setRegion(value);
    setEnvUpdateState(false);
  };

  /**
   * Fetching the kernel details based on the session context and setting the selected mode
   * to serverless or cluster based on the kernel preference.
   */
  const getKernelDetail = async () => {
    const kernelSpecs: any = await KernelSpecAPI.getSpecs();
    const kernels = kernelSpecs.kernelspecs;

    if (kernels && context.sessionContext.kernelPreference.name) {
      if (
        kernels[context.sessionContext.kernelPreference.name].resources
          .endpointParentResource
      ) {
        if (
          kernels[
            context.sessionContext.kernelPreference.name
          ].resources.endpointParentResource.includes('/sessions')
        ) {
          if (!clusterFlag) {
            setSelectedMode('serverless');
          }

          const selectedData: any = serverlessDataList.filter(
            (serverless: any) => {
              return context.sessionContext.kernelDisplayName.includes(
                serverless.serverlessName
              );
            }
          );
          if (selectedData.length > 0) {
            setServerlessDataSelected(selectedData[0].serverlessData);
            setServerlessSelected(selectedData[0].serverlessName);
          } else {
            setServerlessDataSelected({});
            setServerlessSelected('');
          }
        } else {
          const selectedData: any = clusterList.filter((cluster: string) => {
            return context.sessionContext.kernelDisplayName.includes(cluster);
          });
          if (selectedData.length > 0) {
            setClusterSelected(selectedData[0]);
          } else {
            setClusterSelected('');
          }
        }
      }
    }
  };

  /**
   * Effect to handle the initial setup of the component.
   */
  useEffect(() => {
    if (context !== '') {
      setInputFileSelected(
        app.serviceManager.contents.localPath(context.localPath)
      );
    }
    setJobNameSelected('');
    if (!editMode) {
      setParameterDetail([]);
      setParameterDetailUpdated([]);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Effect to fetch the project ID and region from the auth API
   */
  useEffect(() => {
    setLoaderRegion(true);
    setLoaderProjectId(true);
    authApi().then(credentials => {
      if (credentials?.project_id && credentials.region_id) {
        setLoaderProjectId(false);
        setProjectId(credentials.project_id);
        setLoaderRegion(false);
        setRegion(credentials.region_id);
      }
    });
  }, []);

  /**
   * Effect to fetch the list of composers based on the project ID and region.
   */
  useEffect(() => {
    if (projectId && region) {
      listComposersAPI();
    }

    if (!region) {
      setComposerEnvData([]);
      setComposerEnvSelected(null);
      setPackageInstallationMessage('');
      setPackageInstalledMessage('');
      setEnvUpdateState(false);
    }
  }, [projectId, region]);

  /**
   * Effect to validate the job name uniqueness within the selected composer environment.
   */
  useEffect(() => {
    if (composerEnvSelected?.name !== '' && dagList.length > 0) {
      const isUnique = !dagList.some(
        dag => dag.notebookname === jobNameSelected
      );
      setJobNameUniqueValidation(isUnique);
    }
  }, [dagList, jobNameSelected, composerEnvSelected]);

  /**
   * Effect to fetch the kernel details based on the session context and setting the selected mode
   * to serverless or cluster based on the kernel preference.
   */
  useEffect(() => {
    if (context !== '') {
      getKernelDetail();
    }
  }, [serverlessDataList, clusterList]);

  /**
   * Effect to handle the listClustersAPI or listSessionTemplatesAPI based on the selected mode.
   */
  useEffect(() => {
    setPackageInstalledMessage('');
    setPackageInstallationMessage('');
    setEnvUpdateState(false);
    if (selectedMode === 'cluster') {
      listClustersAPI();
    } else {
      listSessionTemplatesAPI();
    }
  }, [selectedMode]);

  /**
   * Effect to reset the region and composer environment selection when the project ID changes.
   */
  useEffect(() => {
    if (!projectId) {
      setRegion('');
      setComposerEnvSelected(null);
      setComposerEnvData([]);
      setPackageInstallationMessage('');
      setPackageInstalledMessage('');
      setEnvUpdateState(false);
    }
  }, [projectId]);

  /**
   * Effect to handle the package installation message, check the required packages and composer environment selection
   * when the packageEditFlag changes.
   */
  useEffect(() => {
    if (isLocalKernel && editMode) {
      setPackageInstallationMessage('');
      setPackageInstalledMessage('');
      setEnvUpdateState(false);
      setPackageInstalledList([]);
      getComposerEnvAPI().then((envData: any) => {
        if (envData) {
          setComposerEnvSelected(envData);
          if (envData?.state === 'RUNNING') {
            checkRequiredPackages(envData);
          } else {
            setEnvUpdateState(true);
          }
        }
      });
    }
  }, [packageEditFlag]);

  return (
    <>
      {createCompleted ? (
        <NotebookJobComponent
          app={app}
          themeManager={themeManager}
          settingRegistry={settingRegistry}
          setCreateCompleted={setCreateCompleted}
          setJobNameSelected={setJobNameSelected}
          setScheduleMode={setScheduleMode}
          setScheduleValue={setScheduleValue}
          setInputFileSelected={setInputFileSelected}
          setParameterDetail={setParameterDetail}
          setParameterDetailUpdated={setParameterDetailUpdated}
          setSelectedMode={setSelectedMode}
          setClusterSelected={setClusterSelected}
          setServerlessSelected={setServerlessSelected}
          setServerlessDataSelected={setServerlessDataSelected}
          serverlessDataList={serverlessDataList}
          setServerlessDataList={setServerlessDataList}
          setServerlessList={setServerlessList}
          setRetryCount={setRetryCount}
          setRetryDelay={setRetryDelay}
          setEmailOnFailure={setEmailOnFailure}
          setEmailonRetry={setEmailOnRetry}
          setEmailOnSuccess={setEmailOnSuccess}
          setEmailList={setEmailList}
          setStopCluster={setStopCluster}
          setTimeZoneSelected={setTimeZoneSelected}
          setEditMode={setEditMode}
          setIsLoadingKernelDetail={setIsLoadingKernelDetail}
          setIsApiError={setIsApiError}
          setApiError={setApiError}
          setExecutionPageFlag={setExecutionPageFlag}
          setIsLocalKernel={setIsLocalKernel}
          setPackageEditFlag={setPackageEditFlag}
          setSchedulerBtnDisable={setSchedulerBtnDisable}
          composerEnvSelected={composerEnvSelected}
          setComposerEnvSelected={setComposerEnvSelected}
          setApiEnableUrl={setApiEnableUrl}
          region={region}
          setRegion={setRegion}
          projectId={projectId}
          setProjectId={setProjectId}
        />
      ) : (
        <div>
          <div className="submit-job-container">
            <div className="create-scheduler-form-element">
              <DynamicDropdown
                value={projectId}
                onChange={(_, projectId: string | null) =>
                  setProjectId(projectId ?? '')
                }
                fetchFunc={projectListAPI}
                label="Composer Project ID*"
                // Always show the clear indicator and hide the dropdown arrow
                // make it very clear that this is an autocomplete.
                sx={{
                  '& .MuiAutocomplete-clearIndicator': {
                    visibility: 'visible'
                  }
                }}
                popupIcon={null}
                className={editMode ? 'disable-item' : ''}
                loaderProjectId={loaderProjectId}
                disabled={true}
              />
            </div>

            <div className="create-scheduler-form-element scheduler-region-top">
              <RegionDropdown
                projectId={projectId}
                region={region}
                onRegionChange={region => handleRegionChange(region)}
                editMode={editMode}
                loaderRegion={loaderRegion}
                setLoaderRegion={setLoaderRegion}
                label={'Composer Region*'}
              />
            </div>
            {!region && <ErrorMessage message="Region is required" />}

            <div className="create-scheduler-form-element block-level-seperation ">
              <Autocomplete
                className="create-scheduler-style"
                options={composerEnvData}
                value={composerEnvSelected}
                onChange={(_event, val) => handleComposerEnvSelected(val)}
                getOptionDisabled={option =>
                  composerEnvironmentStateListForCreate !== option.state
                }
                getOptionLabel={option => option.name}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props;
                  return (
                    <Box key={key} component="li" {...optionProps}>
                      {composerEnvironmentStateListForCreate ===
                      option.state ? (
                        <div>{option.name}</div>
                      ) : (
                        <div className="env-option-row">
                          <div>{option.name}</div>
                          <div>{option.state}</div>
                        </div>
                      )}
                    </Box>
                  );
                }}
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Environment*"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {composerEnvData.length <= 0 &&
                            region &&
                            envApiFlag && (
                              <CircularProgress
                                aria-label="Loading Spinner"
                                data-testid="loader"
                                size={18}
                              />
                            )}
                          {params.InputProps.endAdornment}
                        </>
                      )
                    }}
                  />
                )}
                disabled={editMode || envApiFlag || !region}
                disableClearable={!projectId || !region}
                clearIcon={false}
              />
            </div>
            {!composerEnvSelected && region && (
              <ErrorMessage message="Environment is required field" />
            )}
            {isLocalKernel && editMode && envUpdateState && (
              <ErrorMessage
                message={`The selected composer environment state is set to ${composerEnvSelected?.state}. Please try again.`}
              />
            )}
            {packageInstallationMessage && isLocalKernel && (
              <div className="success-message-package success-message-top">
                <iconWarning.react
                  tag="div"
                  className="icon-white logo-alignment-style success_icon icon-size-status"
                />
                <div className="element-section-top warning-font success-message-cl-package warning-message">
                  {packageInstallationMessage}
                </div>
              </div>
            )}
            {packageInstalledMessage && isLocalKernel && (
              <div className="success-message-package log-icon">
                <iconSuccess.react
                  tag="div"
                  title="Done !"
                  className="icon-white logo-alignment-style success_icon icon-size icon-completed"
                />
                <div className="warning-success-message">
                  {packageInstalledMessage}
                </div>
              </div>
            )}
            <div className="create-scheduler-label block-seperation">
              Output formats
            </div>
            <div className="create-scheduler-form-element block-level-seperation ">
              <FormGroup row={true}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      readOnly
                      checked={true}
                      defaultChecked={true}
                    />
                  }
                  className="create-scheduler-label-style"
                  label={
                    <Typography sx={{ fontSize: 13 }}>Notebook</Typography>
                  }
                />
              </FormGroup>
            </div>
            <div className="create-scheduler-label block-seperation">
              Parameters
            </div>
            <LabelProperties
              labelDetail={parameterDetail}
              setLabelDetail={setParameterDetail}
              labelDetailUpdated={parameterDetailUpdated}
              setLabelDetailUpdated={setParameterDetailUpdated}
              buttonText="ADD PARAMETER"
              keyValidation={keyValidation}
              setKeyValidation={setKeyValidation}
              valueValidation={valueValidation}
              setValueValidation={setValueValidation}
              duplicateKeyError={duplicateKeyError}
              setDuplicateKeyError={setDuplicateKeyError}
              fromPage="scheduler"
            />
            {!isLocalKernel && (
              <>
                <div className="create-scheduler-form-element block-seperation">
                  <FormControl>
                    <RadioGroup
                      aria-labelledby="demo-controlled-radio-buttons-group"
                      name="controlled-radio-buttons-group"
                      value={selectedMode}
                      onChange={handleSelectedModeChange}
                      row={true}
                      data-testid={
                        selectedMode === 'cluster'
                          ? 'cluster-selected'
                          : 'serverless-selected'
                      }
                    >
                      <FormControlLabel
                        value="cluster"
                        control={<Radio size="small" />}
                        label={
                          <Typography sx={{ fontSize: 13 }}>Cluster</Typography>
                        }
                      />
                      <FormControlLabel
                        value="serverless"
                        className="create-scheduler-label-style"
                        control={<Radio size="small" />}
                        label={
                          <Typography sx={{ fontSize: 13 }}>
                            Serverless
                          </Typography>
                        }
                      />
                    </RadioGroup>
                  </FormControl>
                </div>
                <div className="create-scheduler-form-element">
                  {isLoadingKernelDetail && selectedMode !== 'local' && (
                    <CircularProgress
                      size={18}
                      aria-label="Loading Spinner"
                      data-testid="loader"
                    />
                  )}
                  {selectedMode === 'cluster' && !isLoadingKernelDetail && (
                    <>
                      <Autocomplete
                        className="create-scheduler-style"
                        options={clusterList}
                        value={clusterSelected}
                        onChange={(_event, val) => handleClusterSelected(val)}
                        renderInput={params => (
                          <TextField {...params} label="Cluster*" />
                        )}
                      />
                      {!clusterSelected && (
                        <ErrorMessage message="Cluster is required field" />
                      )}
                    </>
                  )}

                  {selectedMode === 'serverless' && !isLoadingKernelDetail && (
                    <>
                      <Autocomplete
                        className="create-scheduler-style"
                        options={serverlessList}
                        value={serverlessSelected}
                        onChange={(_event, val) =>
                          handleServerlessSelected(val)
                        }
                        renderInput={params => (
                          <TextField {...params} label="Serverless*" />
                        )}
                      />
                      {!serverlessSelected && (
                        <ErrorMessage message="Serverless is required field" />
                      )}
                    </>
                  )}
                </div>
                {selectedMode === 'cluster' && (
                  <div className="create-scheduler-form-element input-sub-action">
                    <FormGroup row={true}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={stopCluster}
                            onChange={handleStopCluster}
                          />
                        }
                        className="create-scheduler-label-style"
                        label={
                          <Typography
                            sx={{ fontSize: 13 }}
                            title="Stopping cluster abruptly will impact if any other job is running on the cluster at the moment"
                          >
                            Stop the cluster after notebook execution
                          </Typography>
                        }
                      />
                    </FormGroup>
                  </div>
                )}
              </>
            )}
            <div className="create-scheduler-form-element block-seperation">
              <Input
                className="create-scheduler-style"
                onChange={e => handleRetryCount(Number(e.target.value))}
                value={retryCount}
                Label="Retry count"
                type="number"
              />
            </div>
            <div className="create-scheduler-form-element">
              <Input
                className="create-scheduler-style"
                onChange={e => handleRetryDelay(Number(e.target.value))}
                value={retryDelay}
                Label="Retry delay (minutes)"
                type="number"
              />
            </div>
            <div className="create-scheduler-form-element block-level-seperation">
              <FormGroup row={true}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={emailOnFailure}
                      onChange={handleFailureChange}
                    />
                  }
                  className="create-scheduler-label-style"
                  label={
                    <Typography sx={{ fontSize: 13 }}>
                      Email on failure
                    </Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={emailOnRetry}
                      onChange={handleRetryChange}
                    />
                  }
                  className="create-scheduler-label-style"
                  label={
                    <Typography sx={{ fontSize: 13 }}>
                      Email on retry
                    </Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={emailOnSuccess}
                      onChange={handleSuccessChange}
                    />
                  }
                  className="create-scheduler-label-style"
                  label={
                    <Typography sx={{ fontSize: 13 }}>
                      Email on success
                    </Typography>
                  }
                />
              </FormGroup>
            </div>
            {(emailOnFailure || emailOnRetry || emailOnSuccess) && (
              <div className="create-scheduler-form-element">
                <MuiChipsInput
                  className="select-job-style"
                  onChange={e => handleEmailList(e)}
                  addOnBlur={true}
                  value={emailList}
                  inputProps={{ placeholder: '' }}
                  label="Email recipients"
                />
              </div>
            )}
            {(emailOnFailure || emailOnRetry || emailOnSuccess) &&
              !emailList.length && (
                <ErrorMessage message="Email recipients is required field" />
              )}
            {(emailOnFailure || emailOnRetry || emailOnSuccess) &&
              emailError && (
                <ErrorMessage message="Please enter a valid email address. E.g username@domain.com" />
              )}
            <div className="create-scheduler-label block-seperation">
              Schedule
            </div>
            <div className="create-scheduler-form-element">
              <FormControl>
                <RadioGroup
                  aria-labelledby="demo-controlled-radio-buttons-group"
                  name="controlled-radio-buttons-group"
                  value={scheduleMode}
                  onChange={handleSchedulerModeChange}
                  data-testid={
                    selectedMode === 'runNow'
                      ? 'runNow-selected'
                      : 'runSchedule-selected'
                  }
                >
                  <FormControlLabel
                    value="runNow"
                    className="create-scheduler-label-style"
                    control={<Radio size="small" />}
                    label={
                      <Typography sx={{ fontSize: 13 }}>Run now</Typography>
                    }
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
                  />
                </RadioGroup>
              </FormControl>
            </div>
            {scheduleMode === 'runSchedule' && (
              <>
                <div className="create-scheduler-form-element">
                  <Cron value={scheduleValue} setValue={setScheduleValue} />
                </div>
                <div className="create-scheduler-form-element">
                  <Autocomplete
                    className="create-scheduler-style"
                    options={timezones}
                    value={timeZoneSelected}
                    onChange={(_event, val) => handleTimeZoneSelected(val)}
                    renderInput={params => (
                      <TextField {...params} label="Time Zone" />
                    )}
                  />
                </div>
              </>
            )}
            <div className="save-overlay">
              <Button
                onClick={() => {
                  if (!isSaveDisabled()) {
                    handleCreateJobScheduler();
                  }
                }}
                variant="contained"
                disabled={isSaveDisabled()}
                aria-label={editMode ? ' Update Schedule' : 'Create Schedule'}
              >
                <div>
                  {editMode
                    ? creatingScheduler
                      ? 'UPDATING'
                      : 'UPDATE'
                    : creatingScheduler
                      ? 'CREATING'
                      : 'CREATE'}
                </div>
              </Button>
              <Button
                variant="outlined"
                disabled={creatingScheduler}
                aria-label="cancel Batch"
                onClick={!creatingScheduler ? handleCancel : undefined}
              >
                <div>CANCEL</div>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateNotebookScheduler;
