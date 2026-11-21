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

/** Real SERVICE_DISABLED responses from Google APIs, used by several specs. */

/** Cloud Translation API disabled; the request named the project number. */
export const translationDisabled = () => ({
  code: 403,
  status: 'PERMISSION_DENIED',
  message:
    'Cloud Translation API has not been used in project 1007353032215 before or it is disabled. ' +
    'Enable it by visiting https://console.developers.google.com/apis/api/translate.googleapis.com/overview?project=1007353032215 then retry. ' +
    'If you enabled this API recently, wait a few minutes for the action to propagate to our systems and retry.',
  details: [
    {
      '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
      reason: 'SERVICE_DISABLED',
      domain: 'googleapis.com',
      metadata: {
        activationUrl:
          'https://console.developers.google.com/apis/api/translate.googleapis.com/overview?project=1007353032215',
        serviceTitle: 'Cloud Translation API',
        service: 'translate.googleapis.com',
        containerInfo: '1007353032215',
        consumer: 'projects/1007353032215'
      } as Record<string, string>
    },
    {
      '@type': 'type.googleapis.com/google.rpc.Help',
      links: [
        {
          description: 'Google developers console API activation',
          url: 'https://console.developers.google.com/apis/api/translate.googleapis.com/overview?project=1007353032215'
        }
      ]
    }
  ]
});

/** Cloud Composer API disabled; the request named the project ID. */
export const composerDisabled = () => ({
  code: 403,
  status: 'PERMISSION_DENIED',
  message:
    'Cloud Composer API has not been used in project durczokj-1-237346 before or it is disabled. ' +
    'Enable it by visiting https://console.developers.google.com/apis/api/composer.googleapis.com/overview?project=durczokj-1-237346 then retry.',
  details: [
    {
      '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
      reason: 'SERVICE_DISABLED',
      domain: 'googleapis.com',
      metadata: {
        containerInfo: 'durczokj-1-237346',
        serviceTitle: 'Cloud Composer API',
        activationUrl:
          'https://console.developers.google.com/apis/api/composer.googleapis.com/overview?project=durczokj-1-237346',
        service: 'composer.googleapis.com',
        consumer: 'projects/durczokj-1-237346'
      } as Record<string, string>
    }
  ]
});

/** A 403 that isn't SERVICE_DISABLED but carries a global Console URL. */
export const iamPermissionDenied = () => ({
  code: 403,
  message:
    "Permission 'iam.serviceAccounts.list' denied. See https://console.cloud.google.com/iam-admin/troubleshooter/summary",
  details: [
    {
      '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
      reason: 'IAM_PERMISSION_DENIED',
      domain: 'iam.googleapis.com'
    }
  ]
});
