// SPDX-FileCopyrightText: 2018-2022 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import xs, {Stream} from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats';
import {StateSource, Reducer} from '@cycle/state';
import {ReactElement} from 'react';
import isolate from '@cycle/isolate';
import {ReactSource} from '@cycle/react';
import {AsyncStorageSource} from 'cycle-native-asyncstorage';
import {Command, NavSource} from 'cycle-native-navigation';
import {TypedCommand as StorageCommand} from '~frontend/drivers/asyncstorage';
import {Toast} from '~frontend/drivers/toast';
import {State as AppState} from '~frontend/drivers/appstate';
import {NetworkSource} from '~frontend/drivers/network';
import {SSBSource, Req} from '~frontend/drivers/ssb';
import {GlobalEvent} from '~frontend/drivers/eventbus';
import {DialogSource} from '~frontend/drivers/dialogs';
import {WindowSize} from '~frontend/drivers/window-size';
import {publicTab, Sinks as PublicTabSinks} from './public-tab/index';
import {privateTab, Sinks as PrivateTabSinks} from './private-tab/index';
import {activityTab, Sinks as ActivityTabSinks} from './activity-tab/index';
import {
  connectionsTab,
  Sinks as ConnectionsTabSinks,
} from './connections-tab/index';
import {topBar, Sinks as TBSinks} from './top-bar';
import intent from './intent';
import model, {
  State,
  publicTabLens,
  privateTabLens,
  activityTabLens,
  connectionsTabLens,
  topBarLens,
} from './model';
import view from './view';
import navigation from './navigation';

export interface Sources {
  screen: ReactSource;
  navigation: NavSource;
  globalEventBus: Stream<GlobalEvent>;
  asyncstorage: AsyncStorageSource;
  appstate: Stream<AppState>;
  network: NetworkSource;
  state: StateSource<State>;
  dialog: DialogSource;
  ssb: SSBSource;
  windowSize: Stream<WindowSize>;
}

export interface Sinks {
  screen: Stream<ReactElement<any>>;
  navigation: Stream<Command>;
  asyncstorage: Stream<StorageCommand>;
  state: Stream<Reducer<any>>;
  ssb: Stream<Req>;
  linking: Stream<string>;
  clipboard: Stream<string>;
  toast: Stream<Toast>;
  globalEventBus: Stream<GlobalEvent>;
  exit: Stream<any>;
}

export const navOptions = {
  topBar: {
    visible: false,
    drawBehind: true,
    hideOnScroll: false,
    animate: false,
    borderHeight: 0,
    elevation: 0,
    height: 0,
  },
  sideMenu: {
    left: {
      enabled: true,
    },
  },
};

export function central(sources: Sources): Sinks {
  const state$ = sources.state.stream;

  const actions = intent(sources.screen, sources.globalEventBus, state$);

  const fabPress$: Stream<string> = sources.screen
    .select('fab')
    .events('pressItem');

  const topBarSinks = isolate(topBar, {
    '*': 'topBar',
    state: topBarLens,
  })(sources) as TBSinks;

  const publicTabSinks = isolate(publicTab, {
    state: publicTabLens,
    '*': 'publicTab',
  })({
    ...sources,
    fab: fabPress$,
    scrollToTop: xs.merge(
      actions.scrollToPublicTop$,
      topBarSinks.scrollToPublicTop$,
    ),
  }) as PublicTabSinks;

  const privateTabSinks = isolate(privateTab, {
    state: privateTabLens,
    '*': 'privateTab',
  })({
    ...sources,
    fab: fabPress$,
    scrollToTop: actions.scrollToPrivateTop$,
  }) as PrivateTabSinks;

  const activityTabSinks = isolate(activityTab, {
    state: activityTabLens,
    '*': 'activityTab',
  })({
    ...sources,
    scrollToTop: actions.scrollToActivityTop$,
  }) as ActivityTabSinks;

  const connectionsTabSinks = isolate(connectionsTab, {
    state: connectionsTabLens,
    '*': 'connectionsTab',
  })({...sources, fab: fabPress$}) as ConnectionsTabSinks;

  const fabProps$ = state$
    .map((state) =>
      state.currentTab === 'public'
        ? publicTabSinks.fab
        : state.currentTab === 'private'
        ? privateTabSinks.fab
        : connectionsTabSinks.fab,
    )
    .flatten()
    .compose(dropRepeats());

  const command$ = navigation(
    state$,
    {
      openDrawer$: topBarSinks.menuPress,
      closeDrawer$: actions.closeDrawer$,
      goToSearch$: topBarSinks.publicSearch,
      goToIndexing$: actions.goToIndexing$,
    },
    xs.merge(
      publicTabSinks.navigation,
      privateTabSinks.navigation,
      activityTabSinks.navigation,
      connectionsTabSinks.navigation,
    ),
  );

  const centralReducer$ = model(actions, sources.ssb);

  const reducer$ = xs.merge(
    centralReducer$,
    topBarSinks.state,
    publicTabSinks.state,
    privateTabSinks.state,
    activityTabSinks.state,
    connectionsTabSinks.state,
  ) as Stream<Reducer<State>>;

  const vdom$ = view(
    state$,
    fabProps$,
    topBarSinks.screen,
    publicTabSinks.screen,
    privateTabSinks.screen,
    activityTabSinks.screen,
    connectionsTabSinks.screen,
  );

  const toast$ = xs.merge(publicTabSinks.toast);

  const ssb$ = publicTabSinks.ssb;

  const storageCommand$ = xs.merge(
    topBarSinks.asyncstorage,
    publicTabSinks.asyncstorage,
  );

  const globalEvent$ = xs.merge(
    state$
      .map((state) => state.numOfPublicUpdates)
      .compose(dropRepeats())
      .map(
        (counter) =>
          ({
            type: 'centralScreenUpdate',
            subtype: 'publicUpdates',
            counter,
          } as GlobalEvent),
      ),

    state$
      .map((state) => state.numOfPrivateUpdates)
      .compose(dropRepeats())
      .map(
        (counter) =>
          ({
            type: 'centralScreenUpdate',
            subtype: 'privateUpdates',
            counter,
          } as GlobalEvent),
      ),

    state$
      .map((state) => state.numOfActivityUpdates)
      .compose(dropRepeats())
      .map(
        (counter) =>
          ({
            type: 'centralScreenUpdate',
            subtype: 'activityUpdates',
            counter,
          } as GlobalEvent),
      ),

    state$
      .map((state) => state.connectionsTab)
      .compose(dropRepeats())
      .map(
        (substate) =>
          ({
            type: 'centralScreenUpdate',
            subtype: 'connections',
            substate,
          } as GlobalEvent),
      ),
  );

  return {
    screen: vdom$,
    state: reducer$,
    navigation: command$,
    asyncstorage: storageCommand$,
    ssb: ssb$,
    clipboard: publicTabSinks.clipboard,
    toast: toast$,
    linking: connectionsTabSinks.linking,
    globalEventBus: globalEvent$,
    exit: actions.exitApp$,
  };
}
