// SPDX-FileCopyrightText: 2018-2022 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import xs, {Stream} from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';
import {ReactElement} from 'react';
import {ReactSource, h} from '@cycle/react';
import {StyleSheet, View} from 'react-native';
import {Command, PopCommand, NavSource} from 'cycle-native-navigation';
import {Reducer, StateSource} from '@cycle/state';
import {MsgId, About, FeedId} from 'ssb-typescript';
import {Screens} from '~frontend/screens/enums';
import {navOptions as profileScreenNavOptions} from '~frontend/screens/profile';
import {GetReadable, SSBSource} from '~frontend/drivers/ssb';
import AccountsList from '~frontend/components/AccountsList';
import TopBar from '~frontend/components/TopBar';
import StatusBarBlank from '~frontend/components/StatusBarBlank';
import {globalStyles} from '~frontend/global-styles/styles';
import {Props as ProfileProps} from '../profile/props';
export {navOptions} from './layout';
const pull = require('pull-stream');

export interface Props {
  title: string;
  selfFeedId: FeedId;
  selfAvatarUrl?: string;
  description?: string;
  msgKey: MsgId;
  accounts: Array<FeedId | [string, string]> | null;
}

export interface Sources {
  props: Stream<Props>;
  screen: ReactSource;
  navigation: NavSource;
  state: StateSource<State>;
  ssb: SSBSource;
}

export interface Sinks {
  screen: Stream<ReactElement<any>>;
  navigation: Stream<Command>;
  state: Stream<Reducer<State>>;
}

export interface State {
  title: string;
  description?: string;
  abouts: GetReadable<About & {id: FeedId}> | null;
  selfFeedId: FeedId;
  selfAvatarUrl?: string;
}

export const styles = StyleSheet.create({
  screen: globalStyles.screen,
});

export interface Actions {
  goBack$: Stream<any>;
  goToProfile$: Stream<{id: FeedId}>;
}

function navigation(actions: Actions, state$: Stream<State>) {
  const pop$ = actions.goBack$.mapTo({
    type: 'pop',
  } as PopCommand);

  const toProfile$ = actions.goToProfile$.compose(sampleCombine(state$)).map(
    ([ev, state]) =>
      ({
        type: 'push',
        layout: {
          component: {
            name: Screens.Profile,
            passProps: {
              selfFeedId: state.selfFeedId,
              selfAvatarUrl: state.selfAvatarUrl,
              feedId: ev.id,
            } as ProfileProps,
            options: profileScreenNavOptions,
          },
        },
      } as Command),
  );

  return xs.merge(pop$, toProfile$);
}

function intent(navSource: NavSource, reactSource: ReactSource) {
  return {
    goBack$: xs.merge(
      navSource.backPress(),
      reactSource.select('topbar').events('pressBack'),
    ),

    goToProfile$: reactSource.select('accounts').events('pressAccount'),
  };
}

export function accounts(sources: Sources): Sinks {
  const actions = intent(sources.navigation, sources.screen);

  const vdom$ = sources.state.stream.map((state) => {
    const {description, abouts} = state;

    return h(View, {style: styles.screen}, [
      h(StatusBarBlank),
      h(TopBar, {sel: 'topbar', title: state.title}),
      abouts
        ? h(AccountsList, {
            sel: 'accounts',
            accounts: abouts,
            header: description,
          })
        : null,
    ]);
  });

  const command$ = navigation(actions, sources.state.stream);

  const propsReducer$ = sources.props.map(
    ({selfFeedId, selfAvatarUrl, title, description}) =>
      function propsReducer(prev?: State): State {
        if (prev) {
          return {...prev, selfFeedId, selfAvatarUrl, title, description};
        } else {
          return {abouts: null, selfFeedId, selfAvatarUrl, title, description};
        }
      },
  );

  const aboutsReducer$ = sources.props
    .filter((props) => !!props.accounts)
    .map((props) => {
      const accnts = props.accounts!;
      const hasReactions =
        accnts && accnts.length >= 1 && Array.isArray(accnts[0]);

      const reactions = new Map(
        hasReactions ? (accnts as Array<[FeedId, string]>) : undefined,
      );

      const ids = hasReactions
        ? (accnts as Array<[FeedId, string]>).map((x) => x[0])
        : (accnts as Array<FeedId>);

      return sources.ssb.liteAboutReadable$(ids).map(
        (getReadable) =>
          function aboutsReducer(prev: State): State {
            if (!getReadable) return prev;

            const abouts = (
              hasReactions
                ? () =>
                    pull(
                      getReadable(),
                      pull.map((about: About) => ({
                        ...about,
                        reaction: reactions.get(about.id!),
                      })),
                    )
                : getReadable
            ) as State['abouts'];
            return {...prev, abouts};
          },
      );
    })
    .flatten();

  const reducer$ = xs.merge(propsReducer$, aboutsReducer$);

  return {
    screen: vdom$,
    navigation: command$,
    state: reducer$,
  };
}
