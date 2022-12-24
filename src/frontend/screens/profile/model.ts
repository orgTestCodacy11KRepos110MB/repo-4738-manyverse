// SPDX-FileCopyrightText: 2018-2022 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import xs, {Stream} from 'xstream';
import concat from 'xstream/extra/concat';
import sample from 'xstream-sample';
import {Reducer} from '@cycle/state';
import {AsyncStorageSource} from 'cycle-native-asyncstorage';
import {FeedId, MsgId} from 'ssb-typescript';
import {
  AboutAndExtras,
  Alias,
  SnapshotAbout,
  SSBFriendsQueryDetails,
} from '~frontend/ssb/types';
import {SSBSource, GetReadable} from '~frontend/drivers/ssb';
import {Props} from './props';
import flattenSequentially from 'xstream/extra/flattenSequentially';

export interface State {
  selfFeedId: FeedId;
  lastSessionTimestamp: number;
  preferredReactions: Array<string>;
  selfAvatarUrl?: string;
  reason?: 'connection-attempt';
  displayFeedId: FeedId;
  about: AboutAndExtras;
  snapshot: SnapshotAbout;
  aliases: Array<Alias>;
  following: Array<FeedId> | null;
  followers: Array<FeedId> | null;
  friendsInCommon: Array<FeedId> | null;
  friendsInCommonAbouts: Array<AboutAndExtras> | null;
  followsYou: SSBFriendsQueryDetails | null;
  youFollow: SSBFriendsQueryDetails | null;
  youBlock: SSBFriendsQueryDetails | null;
  connection: 'connected' | 'connecting' | 'disconnecting' | undefined;
  latestPrivateChat: MsgId | 'new' | null;
  // TODO: use `ThreadSummaryWithExtras` but somehow support reply summaries
  getFeedReadable: GetReadable<any> | null;
}

interface Actions {
  refreshFeed$: Stream<any>;
  follow$: Stream<boolean>;
  blockContact$: Stream<null>;
  blockSecretlyContact$: Stream<null>;
  unblockContact$: Stream<null>;
  unblockSecretlyContact$: Stream<null>;
}

function dropCompletion<T>(stream: Stream<T>): Stream<T> {
  return xs.merge(stream, xs.never());
}

export default function model(
  actions: Actions,
  asyncStorageSource: AsyncStorageSource,
  props$: Stream<Props>,
  ssbSource: SSBSource,
): Stream<Reducer<State>> {
  const propsReducer$ = props$.take(1).map(
    (props) =>
      function propsReducer(): State {
        return {
          selfFeedId: props.selfFeedId,
          selfAvatarUrl: props.selfAvatarUrl,
          displayFeedId: props.feedId,
          reason: props.reason,
          lastSessionTimestamp: Infinity,
          preferredReactions: [],
          getFeedReadable: null,
          about: {
            name: '',
            description: '',
            id: props.feedId,
          },
          snapshot: {},
          aliases: [],
          following: null,
          followers: null,
          friendsInCommon: null,
          friendsInCommonAbouts: null,
          followsYou: null,
          youFollow: null,
          youBlock: null,
          connection: void 0,
          latestPrivateChat: null,
        };
      },
  );

  const about$ = props$
    .map((props) => ssbSource.profileAboutLive$(props.feedId))
    .flatten();

  const feedPair$ = (props$ as Stream<Pick<Props, 'feedId' | 'selfFeedId'>>)
    .take(1)
    .compose(dropCompletion)
    .remember();

  const refreshRelationship$ = xs
    .merge(
      actions.follow$,
      actions.blockContact$,
      actions.blockSecretlyContact$,
      actions.unblockContact$,
      actions.unblockSecretlyContact$,
    )
    .map(() =>
      // --o--o----o----o---------o---------o
      concat(
        xs.periodic(500).take(2),
        xs.periodic(1000).take(2),
        xs.periodic(2500).take(2),
      ),
    )
    .flatten()
    .compose(sample(feedPair$));

  const initialFollowsYou$ = feedPair$
    .map((pair) => {
      if (pair.feedId === pair.selfFeedId) return xs.of(null);
      else return ssbSource.isFollowing$(pair.feedId, pair.selfFeedId);
    })
    .flatten();
  const initialYouFollow$ = feedPair$
    .map((pair) => {
      if (pair.feedId === pair.selfFeedId) return xs.of(null);
      else return ssbSource.isFollowing$(pair.selfFeedId, pair.feedId);
    })
    .flatten();
  const initialYouBlock$ = feedPair$
    .map((pair) => {
      if (pair.feedId === pair.selfFeedId) return xs.of(null);
      else return ssbSource.isBlocking$(pair.selfFeedId, pair.feedId);
    })
    .flatten();
  const initialSnapshot$ = props$
    .map((props) => {
      if (props.feedId === props.selfFeedId) return xs.of({});
      else return ssbSource.snapshotAbout$(props.feedId);
    })
    .flatten();
  const initialFollowing$ = props$
    .map((props) => ssbSource.profileEdges$(props.feedId, false, true))
    .take(1)
    .flatten();
  const initialFollowers$ = props$
    .map((props) => ssbSource.profileEdges$(props.feedId, true, true))
    .take(1)
    .flatten();
  const initialFriendsInCommon$ = props$
    .map((props) => {
      if (props.feedId === props.selfFeedId) return xs.of([]);
      else return ssbSource.getFriendsInCommon$(props.feedId);
    })
    .take(1)
    .flatten();

  const initialDetailsReducer$ = xs
    .combine(
      initialFollowsYou$,
      initialYouFollow$,
      initialYouBlock$,
      initialSnapshot$,
      initialFollowing$,
      initialFollowers$,
      initialFriendsInCommon$,
    )
    .map(
      ([
        followsYou,
        youFollow,
        youBlock,
        snapshot,
        following,
        followers,
        friendsInCommon,
      ]) =>
        function initialDetailsReducer(prev: State): State {
          return {
            ...prev,
            followsYou,
            youFollow,
            youBlock,
            snapshot,
            following,
            followers,
            friendsInCommon,
          };
        },
    );

  const updateAboutReducer$ = about$.map(
    (about) =>
      function updateAboutReducer(prev: State): State {
        return {...prev, about};
      },
  );

  const updateFriendsInCommonAbousReducer$ = initialFriendsInCommon$
    .map((friendsInCommon) =>
      // For each of the friendsInCommon, request their `about` ONE at a time,
      // ignoring those who have no picture and name, and pick at most 3
      // abouts to show
      xs
        .fromArray(friendsInCommon)
        .map((id) =>
          ssbSource
            .profileAbout$(id)
            .take(1)
            .filter((about) => !!about.imageUrl && !!about.name),
        )
        .compose(flattenSequentially)
        .take(3)
        .fold((acc, about) => acc.concat(about), [] as AboutAndExtras[])
        .last(),
    )
    .flatten()
    .map(
      (abouts) =>
        function updateFriendsInCommonAbousReducer(prev: State): State {
          return {...prev, friendsInCommonAbouts: abouts};
        },
    );

  const updateYouFollowReducer$ = refreshRelationship$
    .map((pair) => ssbSource.isFollowing$(pair.selfFeedId, pair.feedId))
    .flatten()
    .map(
      (youFollow) =>
        function updateRelationshipReducer(prev: State): State {
          return {...prev, youFollow};
        },
    );

  const updateFollowersReducer$ = refreshRelationship$
    .map((pair) => ssbSource.profileEdges$(pair.feedId, true, true))
    .take(1)
    .flatten()
    .map(
      (followers) =>
        function updateFollowersReducer(prev: State): State {
          return {...prev, followers};
        },
    );

  const youBlock$ = refreshRelationship$
    .map((pair) => ssbSource.isBlocking$(pair.selfFeedId, pair.feedId))
    .flatten();

  const updateYouBlockReducer$ = youBlock$.map(
    (youBlock) =>
      function updateRelationshipReducer(prev: State): State {
        return {...prev, youBlock};
      },
  );

  const updateSnapshotReducer$ = youBlock$
    .filter((youBlock) => youBlock.response === true)
    .compose(sample(props$))
    .map((props) => ssbSource.snapshotAbout$(props.feedId))
    .flatten()
    .map(
      (snapshot) =>
        function updateSnapshotReducer(prev: State): State {
          return {...prev, snapshot};
        },
    );

  const updatePreferredReactionsReducer$ = ssbSource.preferredReactions$.map(
    (preferredReactions) =>
      function updatePreferredReactionsReducer(prev: State): State {
        return {...prev, preferredReactions};
      },
  );

  const updateConnectionReducer$ = ssbSource.peers$.map(
    (peers) =>
      function updateConnectionReducer(prev: State): State {
        const peer = peers.find((p) => p[1].key === prev.about.id);
        if (!peer) return prev;
        const connection = peer[1].state;
        if (connection === prev.connection) return prev;
        return {...prev, connection};
      },
  );

  const updateLatestPrivateChatReducer$ = props$
    .map((props) =>
      props.feedId === props.selfFeedId
        ? xs.never()
        : ssbSource.latestPrivateChatWith$(props.feedId),
    )
    .flatten()
    .map(
      (msgId: MsgId | null) =>
        function updateLatestPrivateChatReducer(prev: State): State {
          const latestPrivateChat = msgId ?? 'new';
          return {...prev, latestPrivateChat};
        },
    );

  const getFeedReadable$ = props$
    .map((props) => ssbSource.profileFeed$(props.feedId))
    .flatten();

  const loadLastSessionTimestampReducer$ = actions.refreshFeed$
    .startWith(null)
    .map(() =>
      asyncStorageSource.getItem('lastSessionTimestamp').map(
        (resultStr) =>
          function lastSessionTimestampReducer(prev: State): State {
            const lastSessionTimestamp = parseInt(resultStr ?? '', 10);
            if (isNaN(lastSessionTimestamp)) {
              return prev;
            } else {
              return {...prev, lastSessionTimestamp};
            }
          },
      ),
    )
    .flatten();

  const updateAliasesReducer$ = props$
    .map((props) => ssbSource.getAliasesLive$(props.feedId))
    .flatten()
    .map(
      (aliases) =>
        function updateAliasesReducer(prev: State): State {
          return {...prev, aliases};
        },
    );

  const updateFeedStreamReducer$ = getFeedReadable$.map(
    (getFeedReadable) =>
      function updateFeedStreamReducer(prev: State): State {
        return {...prev, getFeedReadable};
      },
  );

  return concat(
    propsReducer$,
    xs.merge(
      initialDetailsReducer$,
      loadLastSessionTimestampReducer$,
      updateAboutReducer$,
      updateFriendsInCommonAbousReducer$,
      updateYouFollowReducer$,
      updateFollowersReducer$,
      updateYouBlockReducer$,
      updateSnapshotReducer$,
      updatePreferredReactionsReducer$,
      updateConnectionReducer$,
      updateAliasesReducer$,
      updateFeedStreamReducer$,
      updateLatestPrivateChatReducer$,
    ),
  );
}
