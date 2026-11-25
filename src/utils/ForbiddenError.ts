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

/** Puts Google API 403 errors into the scheduler's error banner. */

import {
  ErrorKindRegistry,
  IGoogleApiError,
  errorKinds
} from './ApiErrorKinds';

/** Banner state setters owned by NotebookScheduler. */
export interface IApiErrorSetters {
  setIsApiError: (value: boolean) => void;
  setApiError: (value: string) => void;
  setApiEnableUrl: (urls: string[]) => void;
}

/**
 * Every 403 shows the banner, because the schedule and environment lists
 * render the error only there. What the banner says, and whether it has a
 * link, is decided by the error kind registry.
 */
export class ForbiddenErrorPresenter {
  constructor(private readonly registry: ErrorKindRegistry) {}

  show(error: IGoogleApiError, setters: IApiErrorSetters): void {
    const banner = this.registry.toBanner(error);
    setters.setIsApiError(true);
    setters.setApiError(banner.message);
    if (banner.url === null) {
      setters.setApiEnableUrl([]);
    } else {
      setters.setApiEnableUrl([banner.url]);
    }
  }
}

// Composition root. Today's function name keeps the call sites unchanged.
const presenter = new ForbiddenErrorPresenter(errorKinds);

export function showForbiddenError(
  error: IGoogleApiError,
  setters: IApiErrorSetters
): void {
  presenter.show(error, setters);
}
