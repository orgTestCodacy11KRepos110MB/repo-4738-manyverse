// SPDX-FileCopyrightText: 2018-2022 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import xs, {Stream} from 'xstream';
import {
  Command,
  PopCommand,
  NavSource,
  PushCommand,
} from 'cycle-native-navigation';
import {Msg} from 'ssb-typescript';
import {ReactElement} from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {ReactSource, h} from '@cycle/react';
import {globalStyles} from '~frontend/global-styles/styles';
import {SSBSource} from '~frontend/drivers/ssb';
import {t} from '~frontend/drivers/localization';
import RawFeed from '~frontend/components/RawFeed';
import TopBar from '~frontend/components/TopBar';
import StatusBarBlank from '~frontend/components/StatusBarBlank';
import {navOptions as rawMessageScreenNavOptions} from '~frontend/screens/raw-msg';
import {Screens} from '~frontend/screens/enums';

export interface Sources {
  screen: ReactSource;
  navigation: NavSource;
  ssb: SSBSource;
}

export interface Sinks {
  screen: Stream<ReactElement<any>>;
  navigation: Stream<Command>;
}

export const navOptions = {
  topBar: {
    visible: false,
    height: 0,
  },
  sideMenu: {
    left: {
      enabled: Platform.OS === 'web',
    },
  },
};

export const styles = StyleSheet.create({
  screen: globalStyles.screen,
});

export interface Actions {
  goBack$: Stream<any>;
  goToRawMsg$: Stream<Msg>;
}

function navigation(actions: Actions) {
  const pop$ = actions.goBack$.mapTo({
    type: 'pop',
  } as PopCommand);

  const toRawMsg$ = actions.goToRawMsg$.map(
    (msg) =>
      ({
        type: 'push',
        layout: {
          component: {
            name: Screens.RawMessage,
            passProps: {msg},
            options: rawMessageScreenNavOptions,
          },
        },
      } as PushCommand),
  );

  return xs.merge(pop$, toRawMsg$);
}

function intent(
  navSource: NavSource,
  reactSource: ReactSource,
  back$: Stream<any>,
) {
  return {
    goBack$: xs.merge(navSource.backPress(), back$),

    goToRawMsg$: reactSource.select('raw-feed').events('pressMsg'),
  };
}

export function rawDatabase(sources: Sources): Sinks {
  const actions = intent(
    sources.navigation,
    sources.screen,
    sources.screen.select('topbar').events('pressBack'),
  );

  const vdom$ = sources.ssb.publicRawFeed$.map((getReadable) =>
    h(View, {style: styles.screen}, [
      h(StatusBarBlank),
      h(TopBar, {sel: 'topbar', title: t('raw_db.title')}),
      h(RawFeed, {sel: 'raw-feed', getReadable}),
    ]),
  );

  const command$ = navigation(actions);

  return {
    screen: vdom$,
    navigation: command$,
  };
}
