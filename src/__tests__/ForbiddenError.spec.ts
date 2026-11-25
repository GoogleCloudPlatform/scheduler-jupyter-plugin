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

import { ErrorKindRegistry, IBanner } from '../utils/ApiErrorKinds';
import { ForbiddenErrorPresenter } from '../utils/ForbiddenError';

function makeSetters() {
  return {
    setIsApiError: jest.fn(),
    setApiError: jest.fn(),
    setApiEnableUrl: jest.fn()
  };
}

/** A presenter whose registry always returns `banner`. */
function presenterReturning(banner: IBanner): ForbiddenErrorPresenter {
  const registry = { toBanner: () => banner } as unknown as ErrorKindRegistry;
  return new ForbiddenErrorPresenter(registry);
}

describe('ForbiddenErrorPresenter', () => {
  it('shows the banner with the enable link', () => {
    const setters = makeSetters();
    presenterReturning({
      message: 'Cloud Composer API is disabled in project p.',
      url: 'https://cloud.google.com/service-usage/docs/enable-disable'
    }).show({ code: 403 }, setters);
    expect(setters.setIsApiError).toHaveBeenCalledWith(true);
    expect(setters.setApiError).toHaveBeenCalledWith(
      'Cloud Composer API is disabled in project p.'
    );
    expect(setters.setApiEnableUrl).toHaveBeenCalledWith([
      'https://cloud.google.com/service-usage/docs/enable-disable'
    ]);
  });

  it('shows the banner without a link and clears the enable URL', () => {
    // The list screens render the error only inside the banner, so it is set
    // for every 403.
    const setters = makeSetters();
    presenterReturning({ message: 'Permission denied.', url: null }).show(
      { code: 403 },
      setters
    );
    expect(setters.setIsApiError).toHaveBeenCalledWith(true);
    expect(setters.setApiError).toHaveBeenCalledWith('Permission denied.');
    expect(setters.setApiEnableUrl).toHaveBeenCalledWith([]);
  });
});
