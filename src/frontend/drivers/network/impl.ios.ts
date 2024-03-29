// SPDX-FileCopyrightText: 2018-2022 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import xs, {Stream} from 'xstream';
const SystemSetting = require('react-native-system-setting').default;
const hasInternet = require('react-native-has-internet');

export default class NetworkSource {
  constructor() {}

  public wifiIsEnabled(): Stream<boolean> {
    return xs.fromPromise(SystemSetting.isWifiEnabled());
  }

  public hasInternetConnection(): Stream<boolean> {
    return xs.fromPromise(hasInternet.isConnected());
  }
}
