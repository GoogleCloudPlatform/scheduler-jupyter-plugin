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
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { Box, LinearProgress } from '@mui/material';
import dayjs, { Dayjs } from 'dayjs';
import { authApi } from '../../utils/Config';
import VertexJobRuns from './VertexJobRuns';
import { iconLeftArrow, iconCreateCluster } from '../../utils/Icons';
import {
  IActivePaginationVariables,
  ISchedulerData,
  IVertexScheduleRunList
} from './VertexInterfaces';
import { LOG_EXPLORER_BASE_URL, VIEW_CLOUD_LOGS } from '../../utils/Const';
import { handleErrorToast } from '../../utils/ErrorUtils';
import CustomDate from '../common/CustomDate';
import { VertexServices } from '../../services/Vertex';

const VertexExecutionHistory = ({
  region,
  setRegion,
  schedulerData,
  scheduleName,
  handleBackButton,
  setExecutionPageFlag,
  setExecutionPageListFlag,
  abortControllers,
  abortApiCall,
  activePaginationVariables
}: {
  region: string;
  setRegion: (value: string) => void;
  schedulerData: ISchedulerData | undefined;
  scheduleName: string;
  handleBackButton: (
    value: IActivePaginationVariables | undefined | null,
    region: string
  ) => void;
  setExecutionPageFlag: (value: boolean) => void;
  setExecutionPageListFlag: (value: boolean) => void;
  abortControllers: any;
  abortApiCall: () => void;
  activePaginationVariables: IActivePaginationVariables | null | undefined;
}): JSX.Element => {
  const today = dayjs();

  const [jobRunId, setJobRunId] = useState<string>('');
  const [vertexScheduleRunsList, setVertexScheduleRunsList] = useState<
    IVertexScheduleRunList[]
  >([]);
  const [jobRunsData, setJobRunsData] = useState<
    IVertexScheduleRunList | undefined
  >();
  const currentDate = new Date().toLocaleDateString();
  const [selectedMonth, setSelectedMonth] = useState<Dayjs | null>(null);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [initialDisplayDate, setInitialDisplayDate] = useState<Dayjs | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [greyListDates, setGreyListDates] = useState<string[]>([]);
  const [redListDates, setRedListDates] = useState<string[]>([]);
  const [greenListDates, setGreenListDates] = useState<string[]>([]);
  const [darkGreenListDates, setDarkGreenListDates] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [hasJobExecutions, setHasJobExecutions] = useState<boolean>(false);

  useEffect(() => {
    authApi()
      .then(credentials => {
        if (credentials?.region_id && credentials?.project_id) {
          if (!region) {
            setRegion(credentials.region_id);
          }
        }
      })
      .catch(error => {
        console.error(error);
      });
    fetchLastRunScheduleExecution();
    setExecutionPageFlag(false);
    setExecutionPageListFlag(true);

    return () => {
      setExecutionPageListFlag(false);
      abortApiCall();
    };
  }, []);

  /**
   * Handles Date selection
   * @param {React.SetStateAction<dayjs.Dayjs | null>} selectedValue selected kernel
   */
  const handleDateSelection = (
    selectedValue: React.SetStateAction<dayjs.Dayjs | null>
  ) => {
    setJobRunId('');
    setSelectedDate(selectedValue);
  };

  /**
   * Handles Month selection
   * @param {React.SetStateAction<dayjs.Dayjs | null>} newMonth selected kernel
   */
  const handleMonthChange = (
    newMonth: React.SetStateAction<dayjs.Dayjs | null>
  ) => {
    const resolvedMonth =
      typeof newMonth === 'function' ? newMonth(today) : newMonth;

    if (!resolvedMonth) {
      setSelectedDate(null);
      setSelectedMonth(null);
      return;
    }

    if (resolvedMonth.month() !== today.month()) {
      setSelectedDate(null);
    } else {
      setSelectedDate(today);
    }
    setJobRunId('');
    setVertexScheduleRunsList([]);
    setSelectedMonth(resolvedMonth);
  };

  /**
   * CustomDay component for rendering a styled day in a date picker.
   * @param {PickersDayProps<Dayjs>} props
   * @returns JSX.Element
   */
  const CustomDay = (props: PickersDayProps<Dayjs>) => {
    return (
      <CustomDate
        selectedDate={selectedDate}
        greyListDates={greyListDates}
        redListDates={redListDates}
        greenListDates={greenListDates}
        darkGreenListDates={darkGreenListDates}
        isLoading={isLoading}
        dateProps={props}
      />
    );
  };

  /**
   *  Redirect to pantheon cloud logs
   */
  const handleLogs = async () => {
    const logExplorerUrl = new URL(LOG_EXPLORER_BASE_URL);
    logExplorerUrl.searchParams.set('query', `SEARCH("${jobRunId}")`);
    if (jobRunsData?.startDate) {
      logExplorerUrl.searchParams.set('cursorTimestamp', jobRunsData.startDate);
    }
    logExplorerUrl.searchParams.set('project', projectId);
    try {
      window.open(logExplorerUrl.toString());
    } catch (error) {
      console.error('Failed to open Log Explorer window:', error);
    }
  };

  /**
   * Fetch last run execution for the schedule
   */
  const fetchLastRunScheduleExecution = async () => {
    setIsLoading(true);
    const fetchLastRunPayload = {
      schedule: schedulerData,
      region: region,
      abortControllers
    };
    const executionData: any =
      await VertexServices.fetchLastRunStatus(fetchLastRunPayload);
    if (executionData) {
      setHasJobExecutions(true);
      setSelectedMonth(executionData ? dayjs(executionData) : null);
      setSelectedDate(executionData ? dayjs(executionData) : null);
      setInitialDisplayDate(executionData ? dayjs(executionData) : null);
    } else {
      setHasJobExecutions(false);
      setSelectedDate(dayjs(currentDate));
      setIsLoading(false);
    }
  };

  useEffect(() => {
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
  }, [projectId]);

  return (
    <>
      <div className="execution-history-main-wrapper">
        <div className="execution-history-header">
          <div
            role="button"
            className="scheduler-back-arrow-icon"
            onClick={() => handleBackButton(activePaginationVariables, region)}
          >
            <iconLeftArrow.react
              tag="div"
              className="icon-white logo-alignment-style"
            />
          </div>
          <div className="create-job-scheduler-title">
            Execution History: {scheduleName}
          </div>
        </div>
        <div className="log-btn right-panel-wrapper">
          <div
            className="execution-history-main-wrapper"
            role="button"
            onClick={handleLogs}
          >
            <div className="create-icon log-icon cursor-icon">
              <iconCreateCluster.react
                tag="div"
                className="logo-alignment-style"
              />
            </div>
            <div className="create-text cursor-icon">{VIEW_CLOUD_LOGS}</div>
          </div>
        </div>
      </div>

      <div className="execution-history-main-full-wrapper execution-top-border">
        <div className="execution-history-full-wrapper execution-wrapper-border-none">
          {isLoading ? (
            <div className="spin-loader-main-execution-history">
              <Box sx={{ width: '100%', height: '1px' }}>
                <LinearProgress />
              </Box>
            </div>
          ) : (
            <div
              className="spin-loader-main-execution-history"
              style={{ height: '4px' }}
            ></div>
          )}
        </div>
        <div className="execution-history-main-wrapper">
          <div
            className={
              'execution-history-left-wrapper calender-top execution-wrapper-border-none'
            }
          >
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateCalendar
                key={
                  initialDisplayDate
                    ? initialDisplayDate.toISOString()
                    : 'default'
                }
                minDate={dayjs(schedulerData?.createTime)}
                maxDate={dayjs(currentDate)}
                referenceDate={selectedMonth ?? initialDisplayDate ?? today}
                onChange={newValue => handleDateSelection(newValue)}
                onMonthChange={handleMonthChange}
                slots={{
                  day: CustomDay
                }}
                className="date-box-shadow"
              />
            </LocalizationProvider>
          </div>
          <div className="execution-history-right-wrapper execution-history-right-wrapper-scroll execution-wrapper-border-none success-message-top">
            <VertexJobRuns
              region={region}
              schedulerData={schedulerData}
              scheduleName={scheduleName}
              setJobRunsData={setJobRunsData}
              setJobRunId={setJobRunId}
              selectedMonth={selectedMonth}
              selectedDate={selectedDate}
              setGreyListDates={setGreyListDates}
              setRedListDates={setRedListDates}
              setGreenListDates={setGreenListDates}
              setDarkGreenListDates={setDarkGreenListDates}
              setIsLoading={setIsLoading}
              isLoading={isLoading}
              vertexScheduleRunsList={vertexScheduleRunsList}
              setVertexScheduleRunsList={setVertexScheduleRunsList}
              abortControllers={abortControllers}
              abortApiCall={abortApiCall}
              hasJobExecutions={hasJobExecutions}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default VertexExecutionHistory;
