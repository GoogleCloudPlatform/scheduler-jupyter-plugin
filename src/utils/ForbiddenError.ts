/**
 * @license
 * Copyright 2026 Google LLC
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

import { getEnableApiBanner, IGoogleApiError } from './ConsoleLinks';

/** Banner state setters owned by NotebookScheduler. */
export interface IApiErrorSetters {
  setIsApiError: (value: boolean) => void;
  setApiError: (value: string) => void;
  setApiEnableUrl: (urls: string[]) => void;
}

/**
 * Shows a 403 from a Google API in the scheduler's error banner.
 *
 * "API disabled" errors get the banner with an enable link (see
 * `getEnableApiBanner`). Any other 403 shows its message without a link.
 * @param error - the `error` object of the API response
 * @param setters - the banner state setters
 */
export function showForbiddenError(
  error: IGoogleApiError,
  setters: IApiErrorSetters
): void {
  const banner = getEnableApiBanner(error);
  if (banner) {
    setters.setIsApiError(true);
    setters.setApiError(banner.message);
    setters.setApiEnableUrl([banner.url]);
  } else {
    setters.setApiError(error.message ?? '');
  }
}
