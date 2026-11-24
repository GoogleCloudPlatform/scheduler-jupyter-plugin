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

/** Presents Google API 403 errors in the scheduler's error banner. */

import { ENABLE_API_DOC_URL, getEnableApiUrl } from './ConsoleLinks';
import {
  IGoogleApiError,
  parseServiceDisabledError
} from './ServiceDisabledError';

/** Text and link of the "API disabled" banner. */
export interface IEnableApiBanner {
  /** Banner text, e.g. "Cloud Composer API is disabled in project my-project." */
  message: string;
  /** Where "Click here to enable it." points. */
  url: string;
}

/** Banner state setters owned by NotebookScheduler. */
export interface IApiErrorSetters {
  setIsApiError: (value: boolean) => void;
  setApiError: (value: string) => void;
  setApiEnableUrl: (urls: string[]) => void;
}

const FALLBACK_MESSAGE = 'A required API is disabled.';
const FORBIDDEN_FALLBACK_MESSAGE = 'Permission denied.';

/**
 * Returns the "API disabled" banner for a Google API error, or null if the
 * error isn't a SERVICE_DISABLED error.
 */
export function getEnableApiBanner(
  error: IGoogleApiError | null | undefined
): IEnableApiBanner | null {
  const disabled = parseServiceDisabledError(error);
  if (!disabled) {
    return null;
  }
  const { service, project, title } = disabled;
  // getEnableApiUrl links the Console API page only on the global Console and
  // the docs everywhere else (Jurisdictional Consoles have no such page).
  const url =
    service && project ? getEnableApiUrl(service, project) : ENABLE_API_DOC_URL;

  let message = FALLBACK_MESSAGE;
  if (title && project) {
    message = `${title} is disabled in project ${project}.`;
  } else if (title) {
    message = `${title} is disabled.`;
  }
  return { message, url };
}

/**
 * Returns the first sentence of a Google API error message.
 *
 * Messages such as IAM_PERMISSION_DENIED continue with a link to the global
 * Console (e.g. the IAM Troubleshooter), which must not be shown on
 * Jurisdictional Console instances. The first sentence names the problem.
 */
function firstSentence(message: string | undefined): string {
  const sentence = (message ?? '').split('. ')[0].trim();
  if (!sentence) {
    return FORBIDDEN_FALLBACK_MESSAGE;
  }
  return sentence.endsWith('.') ? sentence : `${sentence}.`;
}

/**
 * Shows a 403 from a Google API in the scheduler's error banner.
 *
 * Every 403 shows the banner, because the schedule and environment lists
 * render the error only there. "API disabled" errors also get the enable
 * link; any other 403 (e.g. a missing IAM permission) shows the first sentence
 * of its message without a link.
 * @param error - the `error` object of the API response
 * @param setters - the banner state setters
 */
export function showForbiddenError(
  error: IGoogleApiError,
  setters: IApiErrorSetters
): void {
  const banner = getEnableApiBanner(error);
  setters.setIsApiError(true);
  if (banner) {
    setters.setApiError(banner.message);
    setters.setApiEnableUrl([banner.url]);
  } else {
    setters.setApiError(firstSentence(error.message));
    setters.setApiEnableUrl([]);
  }
}
