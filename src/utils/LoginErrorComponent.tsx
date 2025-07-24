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

import React from 'react';
import { login } from './Config';
import { ILoginErrorProps } from '../login/LoginInterfaces';
import { IconsigninGoogle } from './Icons';

const LoginErrorComponent: React.FC<ILoginErrorProps> = ({
  loginError = false,
  setLoginError,
  configError = false
}) => {
  if (configError) {
    return (
      <div className="login-error">
        Please configure gcloud with account, project-id and region
      </div>
    );
  }

  if (loginError) {
    return (
      <>
        <div className="login-error">Please login to continue</div>
        <div style={{ alignItems: 'center' }}>
          <div
            role="button"
            className="signin-google-icon"
            onClick={() => login(setLoginError)}
          >
            <IconsigninGoogle.react
              tag="div"
              className="logo-alignment-style"
            />
          </div>
        </div>
      </>
    );
  }

  return null;
};

export default LoginErrorComponent;
