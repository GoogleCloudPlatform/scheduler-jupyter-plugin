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

import React, { useState, useEffect, useRef } from 'react';
import { useTable, usePagination } from 'react-table';
import TableData from '../../utils/TableData';
import { PaginationView } from '../../utils/PaginationView';
import {
  ICellProps,
  authApi,
  findEnvironmentSelected
} from '../../utils/Config';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { Autocomplete, Box, CircularProgress, TextField } from '@mui/material';
import deleteIcon from '../../../style/icons/scheduler_delete.svg';
import { LabIcon } from '@jupyterlab/ui-components';
import playIcon from '../../../style/icons/scheduler_play.svg';
import pauseIcon from '../../../style/icons/scheduler_pause.svg';
import EditIconDisable from '../../../style/icons/scheduler_edit_dag.svg';
import EditNotebookIcon from '../../../style/icons/scheduler_edit_calendar.svg';
import { SchedulerService } from '../../services/SchedulerServices';
import DeletePopup from '../../utils//DeletePopup';
import PollingTimer from '../../utils/PollingTimer';
import PollingImportErrorTimer from '../../utils/PollingImportErrorTimer';
import ImportErrorPopup from '../../utils/ImportErrorPopup';
import triggerIcon from '../../../style/icons/scheduler_trigger.svg';
import {
  composerEnvironmentStateList,
  GCS_PLUGIN_ID,
  scheduleMode
} from '../../utils/Const';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { RegionDropdown } from '../../controls/RegionDropdown';
import ErrorMessage from '../common/ErrorMessage';
import { DynamicDropdown } from '../../controls/DynamicDropdown';
import { projectListAPI } from '../../services/ProjectService';
import { Notification } from '@jupyterlab/apputils';
import { IComposerAPIResponse } from '../common/SchedulerInteface';

const iconDelete = new LabIcon({
  name: 'launcher:delete-icon',
  svgstr: deleteIcon
});
const iconPlay = new LabIcon({
  name: 'launcher:play-icon',
  svgstr: playIcon
});
const iconPause = new LabIcon({
  name: 'launcher:pause-icon',
  svgstr: pauseIcon
});
const iconEditDag = new LabIcon({
  name: 'launcher:edit-disable-icon',
  svgstr: EditIconDisable
});
const iconEditNotebook = new LabIcon({
  name: 'launcher:edit-notebook-icon',
  svgstr: EditNotebookIcon
});

const iconTrigger = new LabIcon({
  name: 'launcher:trigger-icon',
  svgstr: triggerIcon
});
interface IDagList {
  jobid: string;
  notebookname: string;
  schedule: string;
  scheduleInterval: string;
}

function ListNotebookScheduler({
  app,
  settingRegistry,
  handleDagIdSelection,
  backButtonComposerName,
  setCreateCompleted,
  setJobNameSelected,
  setScheduleMode,
  setScheduleValue,
  setInputFileSelected,
  setParameterDetail,
  setParameterDetailUpdated,
  setSelectedMode,
  setClusterSelected,
  setServerlessSelected,
  setServerlessDataSelected,
  serverlessDataList,
  setServerlessDataList,
  setServerlessList,
  setRetryCount,
  setRetryDelay,
  setEmailOnFailure,
  setEmailonRetry,
  setEmailOnSuccess,
  setEmailList,
  setStopCluster,
  setTimeZoneSelected,
  setEditMode,
  bucketName,
  setBucketName,
  setIsLoadingKernelDetail,
  setIsApiError,
  setApiError,
  setIsLocalKernel,
  setPackageEditFlag,
  setSchedulerBtnDisable,
  composerEnvSelected,
  setComposerEnvSelected,
  setApiEnableUrl,
  region = '',
  setRegion,
  projectId = '',
  setProjectId,
  abortControllers,
  abortApiCall
}: {
  app: JupyterFrontEnd;
  settingRegistry: ISettingRegistry;
  handleDagIdSelection: (composerName: string, dagId: string) => void;
  backButtonComposerName: string;
  setCreateCompleted?: (value: boolean) => void;
  setJobNameSelected?: (value: string) => void;
  setScheduleMode?: (value: scheduleMode) => void;
  setScheduleValue?: (value: string) => void;

  setInputFileSelected?: (value: string) => void;
  setParameterDetail?: (value: string[]) => void;
  setParameterDetailUpdated?: (value: string[]) => void;
  setSelectedMode?: (value: string) => void;
  setClusterSelected?: (value: string) => void;
  setServerlessSelected?: (value: string) => void;
  setServerlessDataSelected?: (value: Record<string, never>) => void;
  serverlessDataList?: string[];
  setServerlessDataList?: (value: string[]) => void;
  setServerlessList?: (value: string[]) => void;
  setRetryCount?: (value: number) => void;
  setRetryDelay?: (value: number) => void;
  setEmailOnFailure?: (value: boolean) => void;
  setEmailonRetry?: (value: boolean) => void;
  setEmailOnSuccess?: (value: boolean) => void;
  setEmailList?: (value: string[]) => void;
  setStopCluster?: (value: boolean) => void;
  setTimeZoneSelected?: (value: string) => void;
  setEditMode?: (value: boolean) => void;
  setIsLoadingKernelDetail?: (value: boolean) => void;
  bucketName: string;
  setBucketName: (value: string) => void;
  setIsApiError: (value: boolean) => void;
  setApiError: (value: string) => void;
  setIsLocalKernel: (value: boolean) => void;
  setPackageEditFlag: (value: boolean) => void;
  setSchedulerBtnDisable: (value: boolean) => void;
  composerEnvSelected: IComposerAPIResponse | null;
  setComposerEnvSelected: (value: IComposerAPIResponse | null) => void;
  setApiEnableUrl: any;
  region: string;
  setRegion: (value: string) => void;
  projectId: string;
  setProjectId: (value: string) => void;
  abortControllers: any;
  abortApiCall: () => void;
}) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [composerEnvData, setComposerEnvData] = useState<
    IComposerAPIResponse[]
  >([]);
  const [dagList, setDagList] = useState<IDagList[]>([]);
  const data = dagList;
  const backselectedEnvironment = backButtonComposerName;
  const [deletePopupOpen, setDeletePopupOpen] = useState<boolean>(false);
  const [importErrorPopupOpen, setImportErrorPopupOpen] =
    useState<boolean>(false);
  const [selectedDagId, setSelectedDagId] = useState('');
  const [editDagLoading, setEditDagLoading] = useState('');
  const [inputNotebookFilePath, setInputNotebookFilePath] = useState('');
  const [editNotebookLoading, setEditNotebookLoading] = useState('');
  const [deletingNotebook, setDeletingNotebook] = useState<boolean>(false);
  const [importErrorData, setImportErrorData] = useState<string[]>([]);
  const [importErrorEntries, setImportErrorEntries] = useState<number>(0);
  const [isGCSPluginInstalled, setIsGCSPluginInstalled] =
    useState<boolean>(false);
  const [loaderProjectId, setLoaderProjectId] = useState<boolean>(false);
  const [triggerLoading, setTriggerLoading] = useState('');
  const [updateLoading, setUpdateLoading] = useState('');
  const [loaderRegion, setLoaderRegion] = useState<boolean>(false);
  const isDagInfoApiLoading = useRef(false);
  const isImportErrorApiLoading = useRef(false);
  const [envApiFlag, setEnvApiFlag] = useState<boolean>(false);
  const [composerChangeFlag, setComposerChangeFlag] = useState<boolean>(false);

  const columns = React.useMemo(
    () => [
      {
        Header: 'Job Name',
        accessor: 'jobid'
      },
      {
        Header: 'Schedule',
        accessor: 'schedule'
      },
      {
        Header: 'Status',
        accessor: 'status'
      },
      {
        Header: 'Actions',
        accessor: 'actions'
      }
    ],
    []
  );
  const timer = useRef<NodeJS.Timeout | undefined>(undefined);
  const pollingDagList = async (
    pollingFunction: () => void,
    pollingDisable: boolean
  ) => {
    timer.current = PollingTimer(
      pollingFunction,
      pollingDisable,
      timer.current
    );
  };

  const timerImportError = useRef<NodeJS.Timeout | undefined>(undefined);
  const pollingImportError = async (
    pollingFunction: () => void,
    pollingDisable: boolean
  ) => {
    timerImportError.current = PollingImportErrorTimer(
      pollingFunction,
      pollingDisable,
      timerImportError.current
    );
  };
  const handleComposerSelected = async (data: IComposerAPIResponse | null) => {
    setIsLoading(true);
    abortApiCall();
    setDagList([]);
    if (data) {
      setComposerEnvSelected(data);
      if (composerEnvironmentStateList.includes(data.state)) {
        setComposerChangeFlag(true);
        await SchedulerService.listDagInfoAPIService(
          setDagList,
          setIsLoading,
          setBucketName,
          data.name,
          region,
          projectId,
          abortControllers,
          isDagInfoApiLoading
        );
        setComposerChangeFlag(false);
      } else {
        setIsLoading(false);
      }
    }
  };
  const handleUpdateScheduler = async (
    dag_id: string,
    is_status_paused: boolean
  ) => {
    await SchedulerService.handleUpdateSchedulerAPIService(
      composerEnvSelected?.name ?? '',
      dag_id,
      is_status_paused,
      setDagList,
      setIsLoading,
      setBucketName,
      setUpdateLoading,
      region,
      projectId
    );
  };
  const handleDeletePopUp = (dag_id: string) => {
    setSelectedDagId(dag_id);
    setDeletePopupOpen(true);
  };
  const handleEditNotebook = async (event: React.MouseEvent) => {
    const jobid = event.currentTarget.getAttribute('data-jobid');
    if (jobid !== null) {
      await SchedulerService.editNotebookSchedulerService(
        bucketName,
        jobid,
        setInputNotebookFilePath,
        setEditNotebookLoading
      );
    }
  };
  const handleTriggerDag = async (event: React.MouseEvent) => {
    const jobid = event.currentTarget.getAttribute('data-jobid');
    if (jobid !== null) {
      await SchedulerService.triggerDagService(
        jobid,
        composerEnvSelected?.name ?? '',
        setTriggerLoading,
        projectId,
        region
      );
    }
  };
  const handleEditDags = async (event: React.MouseEvent) => {
    abortApiCall();
    const jobid = event.currentTarget.getAttribute('data-jobid');
    if (jobid !== null) {
      await SchedulerService.editJobSchedulerService(
        bucketName,
        jobid,
        composerEnvSelected,
        setEditDagLoading,
        setIsLocalKernel,
        setPackageEditFlag,
        setCreateCompleted,
        setJobNameSelected,
        setComposerEnvSelected,
        setScheduleMode,
        setScheduleValue,
        setInputFileSelected,
        setParameterDetail,
        setParameterDetailUpdated,
        setSelectedMode,
        setClusterSelected,
        setServerlessSelected,
        setServerlessDataSelected,
        serverlessDataList,
        setServerlessDataList,
        setServerlessList,
        setRetryCount,
        setRetryDelay,
        setEmailOnFailure,
        setEmailonRetry,
        setEmailOnSuccess,
        setEmailList,
        setStopCluster,
        setTimeZoneSelected,
        setEditMode,
        setIsLoadingKernelDetail,
        region,
        setRegion,
        projectId,
        setProjectId
      );
    }
  };

  const handleCancelDelete = () => {
    setDeletePopupOpen(false);
  };

  const handleDeleteScheduler = async () => {
    setDeletingNotebook(true);
    await SchedulerService.handleDeleteSchedulerAPIService(
      composerEnvSelected?.name ?? '',
      selectedDagId,
      setDagList,
      setIsLoading,
      setBucketName,
      region,
      projectId
    );
    setDeletePopupOpen(false);
    setDeletingNotebook(false);
  };

  const handleDeleteImportError = async (dagId: string) => {
    const fromPage = 'importErrorPage';
    await SchedulerService.handleDeleteSchedulerAPIService(
      composerEnvSelected?.name ?? '',
      dagId,
      setDagList,
      setIsLoading,
      setBucketName,
      fromPage,
      region,
      projectId
    );
  };

  const listComposersAPI = async () => {
    setEnvApiFlag(true);
    setIsLoading(true);
    await SchedulerService.listComposersAPIService(
      setComposerEnvData,
      projectId,
      region,
      setIsApiError,
      setApiError,
      setApiEnableUrl,
      setEnvApiFlag,
      setIsLoading,
      true,
      abortControllers
    );
  };

  const listDagInfoAPI = async () => {
    if (isDagInfoApiLoading.current) {
      return;
    }
    isDagInfoApiLoading.current = true;

    await SchedulerService.listDagInfoAPIService(
      setDagList,
      setIsLoading,
      setBucketName,
      composerEnvSelected?.name ?? '',
      region,
      projectId,
      abortControllers,
      isDagInfoApiLoading
    );
  };

  const handleImportErrorPopup = async () => {
    setImportErrorPopupOpen(true);
  };
  const handleImportErrorClosed = async () => {
    setImportErrorPopupOpen(false);
  };
  const handleImportErrordata = async () => {
    if (isImportErrorApiLoading.current) {
      return;
    }
    isImportErrorApiLoading.current = true;
    await SchedulerService.handleImportErrordataService(
      composerEnvSelected?.name ?? '',
      setImportErrorData,
      setImportErrorEntries,
      projectId,
      region,
      abortControllers,
      isImportErrorApiLoading
    );
  };

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize }
  } = useTable(
    //@ts-expect-error react-table 'columns' which is declared here on type 'TableOptions<ICluster>'
    { columns, data, autoResetPage: false, initialState: { pageSize: 50 } },
    usePagination
  );

  const renderActions = (data: any) => {
    const is_status_paused = data.status === 'Paused';
    return (
      <div className="actions-icon-btn">
        {data.jobid === updateLoading ? (
          <div className="icon-buttons-style">
            <CircularProgress
              size={18}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
          </div>
        ) : (
          <div
            role="button"
            className="icon-buttons-style"
            title={is_status_paused ? 'Unpause' : 'Pause'}
            onClick={e => handleUpdateScheduler(data.jobid, is_status_paused)}
          >
            {is_status_paused ? (
              <iconPlay.react
                tag="div"
                className="icon-white logo-alignment-style"
              />
            ) : (
              <iconPause.react
                tag="div"
                className="icon-white logo-alignment-style"
              />
            )}
          </div>
        )}
        {data.jobid === triggerLoading ? (
          <div className="icon-buttons-style">
            <CircularProgress
              size={18}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
          </div>
        ) : (
          <div
            role="button"
            className={
              !is_status_paused
                ? 'icon-buttons-style'
                : 'icon-buttons-style-disable '
            }
            title={
              !is_status_paused
                ? 'Trigger the job'
                : " Can't Trigger Paused job"
            }
            data-jobid={data.jobid}
            onClick={e => {
              if (!is_status_paused) {
                handleTriggerDag(e);
              }
            }}
          >
            <iconTrigger.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
          </div>
        )}
        {data.jobid === editDagLoading ? (
          <div className="icon-buttons-style">
            <CircularProgress
              size={18}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
          </div>
        ) : (
          <div
            role="button"
            className="icon-buttons-style"
            title="Edit Schedule"
            data-jobid={data.jobid}
            onClick={e => handleEditDags(e)}
          >
            <iconEditNotebook.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
          </div>
        )}
        {isGCSPluginInstalled ? ( // Check if GCS plugin is installed
          // If installed, show the edit notebook icon
          data.jobid === editNotebookLoading ? (
            <div className="icon-buttons-style">
              <CircularProgress
                size={18}
                aria-label="Loading Spinner"
                data-testid="loader"
              />
            </div>
          ) : (
            <div
              role="button"
              className="icon-buttons-style"
              title="Edit Notebook"
              data-jobid={data.jobid}
              onClick={e => handleEditNotebook(e)}
            >
              <iconEditDag.react
                tag="div"
                className="icon-white logo-alignment-style"
              />
            </div>
          )
        ) : (
          // If not installed, show the disabled edit icon
          // ToDo: change css class to display disabled icon after GCS plugin release.
          <div
            role="button"
            className="edit-icon-buttons-display"
            title="Install GCS Plugin to enable notebook editing"
          >
            <iconEditDag.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
          </div>
        )}
        <div
          role="button"
          className="icon-buttons-style"
          title="Delete"
          onClick={() => handleDeletePopUp(data.jobid)}
        >
          <iconDelete.react
            tag="div"
            className="icon-white logo-alignment-style"
          />
        </div>
      </div>
    );
  };

  const tableDataCondition = (cell: ICellProps) => {
    if (cell.column.Header === 'Actions') {
      return (
        <td {...cell.getCellProps()} className="clusters-table-data">
          {renderActions(cell.row.original)}
        </td>
      );
    } else if (cell.column.Header === 'Job Name') {
      return (
        <td {...cell.getCellProps()} className="clusters-table-data">
          <span
            onClick={() => {
              if (
                composerEnvSelected &&
                Object.hasOwn(composerEnvSelected, 'name') &&
                composerEnvSelected.name
              ) {
                handleDagIdSelection(composerEnvSelected?.name, cell.value);
              }
            }}
          >
            {cell.value}
          </span>
        </td>
      );
    } else {
      return (
        <td {...cell.getCellProps()} className="clusters-table-data">
          {cell.render('Cell')}
        </td>
      );
    }
  };
  /**
   * Check if GCS plugin is installed
   * If installed, set isGCSPluginInstalled to true
   * Else set it to false
   */
  const checkGCSPluginAvailability = async () => {
    try {
      const isPluginInstalled = app.hasPlugin(GCS_PLUGIN_ID);
      setIsGCSPluginInstalled(isPluginInstalled);
    } catch (error) {
      Notification.error('Could not check GCS plugin availability', {
        autoClose: false
      });
    }
  };

  const openEditDagNotebookFile = async () => {
    const filePath = inputNotebookFilePath.replace('gs://', 'gs:');
    const openNotebookFile: any = await app.commands.execute(
      'docmanager:open',
      {
        path: filePath
      }
    );
    setInputNotebookFilePath('');
    if (openNotebookFile) {
      setEditNotebookLoading('');
    }
  };

  /**
   * Changing the region value and empyting the value of environemnt
   * @param {string} value selected region
   */
  const handleRegionChange = (value: string) => {
    abortApiCall();
    setRegion(value);
    setDagList([]);
    if (setComposerEnvSelected) {
      setComposerEnvSelected(null);
      setComposerEnvData([]);
    }
  };

  /**
   * Changing the project value and empyting the value of region and environment
   * @param {string} value selected project name
   */
  const handleProjectIdChange = (projectId: string | null) => {
    abortApiCall();
    setProjectId(projectId ?? '');
    setRegion('');
    if (setComposerEnvSelected) {
      setComposerEnvSelected(null);
    }
  };

  useEffect(() => {
    if (inputNotebookFilePath !== '') {
      openEditDagNotebookFile();
    }
  }, [inputNotebookFilePath]);

  useEffect(() => {
    setLoaderProjectId(true);
    setLoaderRegion(true);
    authApi().then(credentials => {
      if (credentials?.project_id && credentials?.region_id) {
        setLoaderProjectId(false);
        setLoaderRegion(false);
        setProjectId(projectId || credentials.project_id);
        setRegion(region || credentials.region_id);
      }
    });
    checkGCSPluginAvailability();
    const loadComposerListAndSelectFirst = async () => {
      await listComposersAPI();
    };
    loadComposerListAndSelectFirst();

    setSchedulerBtnDisable(false);
  }, []);

  useEffect(() => {
    if (composerEnvData.length === 0) {
      setComposerEnvSelected(null);
      setDagList([]);
    }
    if (
      composerEnvData.length > 0 &&
      backselectedEnvironment === '' &&
      composerEnvSelected === null
    ) {
      setComposerEnvSelected(composerEnvData[0]);
    }
    if (composerEnvData.length > 0 && backselectedEnvironment !== '') {
      const selectedEnvironmentSchedule = findEnvironmentSelected(
        backselectedEnvironment,
        composerEnvData
      );

      if (selectedEnvironmentSchedule) {
        setComposerEnvSelected(selectedEnvironmentSchedule);
      }
    }
  }, [composerEnvData]);

  useEffect(() => {
    if (
      composerEnvSelected &&
      composerEnvSelected?.name !== '' &&
      !composerChangeFlag &&
      composerEnvironmentStateList.includes(composerEnvSelected?.state)
    ) {
      setIsLoading(true);
      listDagInfoAPI();
      handleImportErrordata();
    }
  }, [composerEnvSelected]);

  useEffect(() => {
    if (
      composerEnvSelected &&
      composerEnvSelected.name !== '' &&
      composerEnvironmentStateList.includes(composerEnvSelected?.state)
    ) {
      pollingDagList(listDagInfoAPI, false);
    }
    return () => {
      pollingDagList(listDagInfoAPI, true);
    };
  }, [composerEnvSelected]);

  useEffect(() => {
    //explicitly set the import error data to empty so that it is cleared even when APi call below is aborted.
    setImportErrorData([]);
    setImportErrorEntries(0);
    if (
      composerEnvSelected &&
      Object.hasOwn(composerEnvSelected, 'name') &&
      composerEnvSelected.name !== ''
    ) {
      pollingImportError(handleImportErrordata, false);
    }
    return () => {
      pollingImportError(handleImportErrordata, true);
    };
  }, [composerEnvSelected]);

  useEffect(() => {
    if (!projectId) {
      setRegion('');
      setDagList([]);
      setComposerEnvData([]);
      setComposerEnvSelected(null);
      setImportErrorData([]);
      setImportErrorEntries(0);
    }
  }, [projectId]);

  useEffect(() => {
    if (!region) {
      setComposerEnvData([]);
      setDagList([]);
      setComposerEnvSelected(null);
      setImportErrorData([]);
      setImportErrorEntries(0);
    } else {
      if (composerEnvSelected) {
        setComposerEnvSelected(composerEnvSelected);
      } else {
        listComposersAPI();
      }
    }
  }, [region]);

  return (
    <div>
      <div className="select-text-overlay-scheduler">
        <div className="select-panel-list">
          <div>
            <div className="create-scheduler-form-element select-panel-list-view-lay table-right-space">
              <DynamicDropdown
                value={projectId}
                onChange={(_, projectId: string | null) => {
                  handleProjectIdChange(projectId);
                }}
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
                loaderProjectId={loaderProjectId}
                disabled={true}
              />
            </div>
            {!projectId && (
              <ErrorMessage message="Project ID is required" showIcon={false} />
            )}
          </div>

          <div>
            <div className="create-scheduler-form-element select-panel-list-view-lay table-right-space">
              <RegionDropdown
                projectId={projectId}
                region={region}
                onRegionChange={region => handleRegionChange(region)}
                loaderRegion={loaderRegion}
                setLoaderRegion={setLoaderRegion}
                label={'Composer Region*'}
              />
            </div>
            {!region && (
              <ErrorMessage message="Region is required" showIcon={false} />
            )}
          </div>

          <div className="create-scheduler-form-element select-panel-list-view-lay">
            <Autocomplete
              options={composerEnvData}
              value={composerEnvSelected}
              onChange={(_event, val) => {
                handleComposerSelected(val);
              }}
              getOptionDisabled={option =>
                !composerEnvironmentStateList.includes(option.state)
              }
              getOptionLabel={option => option.name}
              renderOption={(props, option) => {
                const { key, ...optionProps } = props;
                return (
                  <Box key={key} component="li" {...optionProps}>
                    {composerEnvironmentStateList.includes(option.state) ? (
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
            />
            {!composerEnvSelected && (
              <ErrorMessage
                message="Environment is required"
                showIcon={false}
              />
            )}
          </div>
        </div>

        {importErrorEntries > 0 && projectId && region && (
          <div className="import-error-parent">
            <div
              className="accordion-button"
              role="button"
              aria-label="Show Import Errors"
              title="Show Import Errors"
              onClick={handleImportErrorPopup}
            >
              Show Schedule Errors ({importErrorEntries})
            </div>
            {importErrorPopupOpen && (
              <ImportErrorPopup
                importErrorData={importErrorData}
                importErrorEntries={importErrorEntries}
                importErrorPopupOpen={importErrorPopupOpen}
                onClose={handleImportErrorClosed}
                onDelete={(dagId: string) => handleDeleteImportError(dagId)}
              />
            )}
          </div>
        )}
      </div>

      {dagList.length > 0 ? (
        <div className="notebook-templates-list-table-parent table-space-around">
          <TableData
            getTableProps={getTableProps}
            headerGroups={headerGroups}
            getTableBodyProps={getTableBodyProps}
            isLoading={isLoading}
            rows={rows}
            page={page}
            prepareRow={prepareRow}
            tableDataCondition={tableDataCondition}
            fromPage="Notebook Schedulers"
          />
          {dagList.length > 50 && (
            <PaginationView
              pageSize={pageSize}
              setPageSize={setPageSize}
              pageIndex={pageIndex}
              allData={dagList}
              previousPage={previousPage}
              nextPage={nextPage}
              canPreviousPage={canPreviousPage}
              canNextPage={canNextPage}
            />
          )}
          {deletePopupOpen && (
            <DeletePopup
              onCancel={() => handleCancelDelete()}
              onDelete={() => handleDeleteScheduler()}
              deletePopupOpen={deletePopupOpen}
              DeleteMsg={`This will delete ${selectedDagId} and cannot be undone.`}
              deletingNotebook={deletingNotebook}
            />
          )}
        </div>
      ) : (
        <div>
          {isLoading && (
            <div className="spin-loader-main">
              <CircularProgress
                className="spin-loader-custom-style"
                size={18}
                aria-label="Loading Spinner"
                data-testid="loader"
              />
              Loading Notebook Schedulers
            </div>
          )}
          {!isLoading && (
            <div className="no-data-style">No rows to display</div>
          )}
        </div>
      )}
    </div>
  );
}
export default ListNotebookScheduler;
