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

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback
} from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete, { AutocompleteProps } from '@mui/material/Autocomplete';
import {
  ChipTypeMap,
  CircularProgress,
  Paper,
  PaperProps
} from '@mui/material';
import { handleDebounce } from '../utils/Config';

type Props = {
  fetchFunc: (search: string) => Promise<string[]>;
  label: string;
  loaderProjectId?: boolean;
};

/**
 * Component to render a dynamic selector dropdown.
 */
export function DynamicDropdown(
  props: Props &
    Omit<
      AutocompleteProps<
        string,
        undefined,
        boolean,
        undefined,
        ChipTypeMap['defaultComponent']
      >,
      'renderInput' | 'options'
    >
) {
  const { value, fetchFunc, label, loaderProjectId, ...remainderProps } = props;
  const [search, setSearch] = useState('');
  const [filteredList, setFilteredList] = useState<string[]>([]);
  const currentSearch = useRef(search);

  const debouncedFetch = useCallback(
    handleDebounce((search: string) => {
      currentSearch.current = search;
      fetchFunc(search).then(items => {
        if (currentSearch.current !== search) {
          //To update the results as per change in prefix
          return;
        }
        setFilteredList(items);
      });
    }, 500), // 500ms debounce
    [fetchFunc]
  );

  useEffect(() => {
    debouncedFetch(search);
  }, [search, debouncedFetch]);

  /**
   * This is the last selected value when the dropdown is opened. We
   * always ensure that the current ID exists in the dropdown list,
   * prepending it if necessary.
   */
  const [hoistedValue, setHoistedValue] = useState(value);

  const finalList = useMemo(() => {
    if (
      value &&
      value.length > 0 &&
      !filteredList.find(item => item === hoistedValue)
    ) {
      // If the hoisted value is not in the results from the API
      // call, prepend it.
      return [hoistedValue, ...filteredList];
    }
    return filteredList;
  }, [filteredList, hoistedValue]) as string[];

  return (
    <Autocomplete
      value={value}
      inputValue={search}
      options={finalList}
      onOpen={() => setHoistedValue(value)}
      onInputChange={(_, val) => setSearch(val)}
      filterOptions={options => options}
      PaperComponent={(props: PaperProps) => <Paper elevation={8} {...props} />}
      renderInput={params => (
        <TextField
          {...params}
          label={label}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loaderProjectId && (
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
      {...remainderProps}
      disableClearable={loaderProjectId && !value}
    />
  );
}
