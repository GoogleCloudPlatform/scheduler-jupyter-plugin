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

import React, { useMemo } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import { useRegion } from '../services/RegionService';
import { CircularProgress, Paper, PaperProps } from '@mui/material';
import { VERTEX_SCHEDULE } from '../utils/Const';

type Props = {
  /** The currently selected project ID */
  projectId: string;
  /** The currently selected Region */
  region: string;
  /** Callback function for when the project ID is changed by the dropdown */
  onRegionChange: (projectId: string) => void;
  /** Edit page */
  editMode?: boolean;
  /** List of Regions */
  regionsList?: Array<string>;
  regionDisable?: boolean;
  fromPage?: string;
  /** Initial loading flag for region */
  loaderRegion?: boolean;
  setLoaderRegion?: (value: boolean) => void;
  label?: string;
};

/**
 * Component to render a region selector dropdown.
 */
export function RegionDropdown(props: Props) {
  const {
    projectId,
    region,
    onRegionChange,
    editMode,
    regionsList,
    regionDisable,
    fromPage,
    loaderRegion,
    setLoaderRegion,
    label
  } = props;
  let regionStrList: string[] = [];

  if (!regionsList) {
    const regions = useRegion(projectId, setLoaderRegion);

    regionStrList = useMemo(
      () => regions.map(region => region.name),
      [regions]
    );
  }

  return (
    <Autocomplete
      value={
        regionsList ? (regionsList?.includes(region) ? region : '') : region
      }
      options={regionsList ?? regionStrList}
      onChange={(_, value) => onRegionChange(value ?? '')}
      PaperComponent={(props: PaperProps) => <Paper elevation={8} {...props} />}
      renderInput={params => (
        <TextField
          {...params}
          label={label || 'Region*'}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {(loaderRegion && fromPage !== VERTEX_SCHEDULE && !region) ||
                (fromPage === VERTEX_SCHEDULE && loaderRegion && !region) ? (
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
      disabled={editMode || regionDisable}
      disableClearable={!region}
    />
  );
}
