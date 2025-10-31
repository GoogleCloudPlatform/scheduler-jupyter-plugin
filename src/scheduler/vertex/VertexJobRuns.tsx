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
 * Unless required by applicable law or agreed to in writing,
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import React, { useEffect } from 'react';
import { useTable, useGlobalFilter } from 'react-table';
import { CircularProgress } from '@mui/material';
import dayjs, { Dayjs } from 'dayjs';
import TableData from '../../utils/TableData';
import { IVertexScheduleRunList, ISchedulerData } from './VertexInterfaces';
import { VertexServices } from '../../services/Vertex';
import { iconDash } from '../../utils/Icons';
import VertexExecutionHistoryActions from './VertexExecutionHistoryActions';
import { IVertexExecutionHistoryCellProps } from '../../utils/Config';
import {
  EXECUTION_DATE_SELECTION_HELPER_TEXT,
  NO_EXECUTION_FOUND
} from '../../utils/Const';

const VertexJobRuns = ({
  region,
  schedulerData,
  scheduleName,
  setJobRunsData,
  setJobRunId,
  selectedMonth,
  selectedDate,
  setGreyListDates,
  setRedListDates,
  setGreenListDates,
  setDarkGreenListDates,
  setIsLoading,
  isLoading,
  vertexScheduleRunsList,
  setVertexScheduleRunsList,
  abortControllers,
  abortApiCall,
  hasJobExecutions
}: {
  region: string;
  schedulerData: ISchedulerData | undefined;
  scheduleName: string;
  setJobRunsData: React.Dispatch<
    React.SetStateAction<IVertexScheduleRunList | undefined>
  >;
  setJobRunId: (value: string) => void;
  selectedMonth: Dayjs | null;
  selectedDate: Dayjs | null;
  setGreyListDates: (value: string[]) => void;
  setRedListDates: (value: string[]) => void;
  setGreenListDates: (value: string[]) => void;
  setDarkGreenListDates: (value: string[]) => void;
  setIsLoading: (value: boolean) => void;
  isLoading: boolean;
  vertexScheduleRunsList: IVertexScheduleRunList[];
  setVertexScheduleRunsList: (value: IVertexScheduleRunList[]) => void;
  abortControllers: any;
  abortApiCall: () => void;
  hasJobExecutions: boolean;
}): JSX.Element => {
  /**
   * Filters vertex schedule runs list based on the selected date.
   */
  const filteredData = React.useMemo(() => {
    if (selectedDate) {
      const selectedDateString = selectedDate.toDate().toDateString(); // Only date, ignoring time
      return vertexScheduleRunsList.filter(scheduleRun => {
        return new Date(scheduleRun.date).toDateString() === selectedDateString;
      });
    }
    return [];
  }, [vertexScheduleRunsList, selectedDate]);

  // Sync filtered data with the parent component's state
  useEffect(() => {
    if (filteredData.length > 0) {
      setJobRunsData(filteredData[0]);
      setJobRunId(filteredData[0].jobRunId);
    }
  }, [filteredData, setJobRunsData]);

  const columns = React.useMemo(
    () => [
      {
        Header: 'State',
        accessor: 'state'
      },
      {
        Header: 'Date',
        accessor: 'date'
      },
      {
        Header: 'Time',
        accessor: 'time'
      },
      {
        Header: 'Code',
        accessor: 'code'
      },
      {
        Header: 'Status Message',
        accessor: 'statusMessage'
      },
      {
        Header: 'Actions',
        accessor: 'actions'
      }
    ],
    []
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    page
  } = useTable(
    {
      //@ts-expect-error react-table 'columns' which is declared here on type 'TableOptions<IVertexScheduleRunList>'
      columns,
      data: filteredData,
      autoResetPage: false,
      initialState: { pageSize: filteredData.length }
    },
    useGlobalFilter
  );

  const tableDataCondition = (cell: IVertexExecutionHistoryCellProps) => {
    if (cell.column.Header === 'Actions') {
      return (
        <td
          {...cell.getCellProps()}
          className="clusters-table-data sub-title-heading"
        >
          <VertexExecutionHistoryActions
            data={cell.row.original}
            jobRunId={cell.row.original.jobRunId}
            state={cell.row.original.state}
            gcsUrl={cell.row.original.gcsUrl}
            fileName={cell.row.original.fileName}
            scheduleName={scheduleName}
            abortControllers={abortControllers}
          />
        </td>
      );
    } else if (cell.column.Header === 'State') {
      if (cell.value === 'succeeded') {
        return (
          <td
            {...cell.getCellProps()}
            className="notebook-template-table-data"
            onClick={() => handleVertexScheduleRunStateClick(cell.row.original)}
          >
            <div className="dag-runs-table-data-state-success execution-state">
              {cell.render('Cell')}
            </div>
          </td>
        );
      } else if (cell.value === 'failed') {
        return (
          <td
            {...cell.getCellProps()}
            className="notebook-template-table-data"
            onClick={() => handleVertexScheduleRunStateClick(cell.row.original)}
          >
            <div className="dag-runs-table-data-state-failure execution-state">
              {cell.render('Cell')}
            </div>
          </td>
        );
      } else if (cell.value === 'running') {
        return (
          <div>
            <td
              {...cell.getCellProps()}
              className="notebook-template-table-data"
              onClick={() =>
                handleVertexScheduleRunStateClick(cell.row.original)
              }
            >
              <div className="dag-runs-table-data-state-running execution-state">
                {cell.render('Cell')}
              </div>
            </td>
          </div>
        );
      } else if (cell.value === 'queued') {
        return (
          <div>
            <td
              {...cell.getCellProps()}
              className="notebook-template-table-data"
              onClick={() =>
                handleVertexScheduleRunStateClick(cell.row.original)
              }
            >
              <div className="dag-runs-table-data-state-queued execution-state table-right-space">
                {cell.render('Cell')}
              </div>
            </td>
          </div>
        );
      }
    } else if (
      cell.column.Header === 'Code' ||
      cell.column.Header === 'Status Message'
    ) {
      if (cell.value === '-') {
        return (
          <td {...cell.getCellProps()} className="notebook-template-table-data">
            <iconDash.react tag="div" />
          </td>
        );
      } else {
        <td {...cell.getCellProps()} className="notebook-template-table-data">
          {cell.render('Cell')}
        </td>;
      }
    } else if (cell.column.Header === 'Date') {
      return (
        <td
          {...cell.getCellProps()}
          className="clusters-table-data table-cell-overflow"
        >
          {dayjs(cell.value).format('lll')}
        </td>
      );
    }
    return (
      <td {...cell.getCellProps()} className="notebook-template-table-data">
        {cell.render('Cell')}
      </td>
    );
  };

  /**
   * @param {Object} data - The data object containing information about the Vertex Schedule run.
   * @param {string} data.id - The optional ID of the Vertex Schedule run.
   * @param {string} data.status - The optional status of the Vertex Schedule run.
   * @param {string} data.jobRunId - The optional jobRunId of the Vertex Schedule run.
   *
   * @description Updates the jobRunId state if a jobRunId is provided in the data object.
   * Triggered when a Vertex Schedule run state is clicked.
   */
  const handleVertexScheduleRunStateClick = (data: {
    id?: string;
    status?: string;
    jobRunId?: string;
  }) => {
    if (data.jobRunId) {
      setJobRunId(data.jobRunId);
    }
  };

  const scheduleRunsList = async () => {
    await VertexServices.executionHistoryServiceList(
      region,
      schedulerData,
      selectedMonth,
      setIsLoading,
      setVertexScheduleRunsList,
      setGreyListDates,
      setRedListDates,
      setGreenListDates,
      setDarkGreenListDates,
      abortControllers
    );
  };

  useEffect(() => {
    if (selectedMonth !== null) {
      scheduleRunsList();
    }
  }, [selectedMonth]);

  useEffect(() => {
    return () => {
      abortApiCall();
    };
  }, []);

  return (
    <div>
      {!isLoading && filteredData && filteredData.length > 0 ? (
        <div className="table-main-execution">
          <div className="dag-runs-list-table-parent table-execution-history-vertex">
            <TableData
              getTableProps={getTableProps}
              headerGroups={headerGroups}
              getTableBodyProps={getTableBodyProps}
              rows={rows}
              page={page}
              prepareRow={prepareRow}
              tableDataCondition={tableDataCondition}
              fromPage="vertexTaskLog"
            />
          </div>
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
              Loading History
            </div>
          )}
          {!isLoading &&
            filteredData.length === 0 &&
            (hasJobExecutions && !selectedDate ? (
              <div className="no-data-style">
                {EXECUTION_DATE_SELECTION_HELPER_TEXT}
              </div>
            ) : selectedDate && hasJobExecutions ? (
              <div className="no-data-style">
                No rows to display on{' '}
                {selectedDate
                  ?.toDate()
                  .toDateString()
                  .split(' ')
                  .slice(1)
                  .join(' ')}
              </div>
            ) : (
              <div className="no-data-style">{NO_EXECUTION_FOUND}</div>
            ))}
        </div>
      )}
    </div>
  );
};

export default VertexJobRuns;
