// SPDX-FileCopyrightText: 2018-2022 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import {
  Msg,
  Content,
  FeedId,
  About,
  MsgId,
  AliasContent,
  GatheringUpdateContent,
  ContactContent,
} from 'ssb-typescript';
import {Stream} from 'xstream';
import {Peer as ConnQueryPeer} from 'ssb-conn-query/lib/types';

export type GatheringInfo = Omit<GatheringUpdateContent, 'type'>;

export type GatheringAttendee = {
  feedId: string;
  name?: string;
  avatarUrl?: string;
};
export type GatheringAttendees = Array<GatheringAttendee>;

export type Reactions = Array<[FeedId, string]> | null;

export interface PressAddReactionEvent {
  msgKey: MsgId;
  value: 0 | 1;
  reaction: string | null;
}

export interface PressReactionsEvent {
  msgKey: MsgId;
  reactions: Reactions;
}

export interface PressGatheringAttendeesEvent {
  msgKey: MsgId;
  attendees: GatheringAttendees;
}

export interface PressBlockAccount {
  feedId: FeedId;
  name?: string;
  image?: string;
}

export type MsgAndExtras<C = Content> = Msg<C> & {
  value: {
    _$manyverse$metadata: {
      reactions?: Stream<NonNullable<Reactions>>;
      gatheringInfo?: Stream<NonNullable<GatheringInfo>>;
      gatheringAttendees?: Stream<NonNullable<Array<GatheringAttendee>>>;
      about: {
        name?: string;
        imageUrl: string | null;
      };
      contact?: {
        name?: string;
      };
    };
  };
};

export type ContactEvent = 'followed' | 'blocked' | 'unfollowed' | 'unblocked';

export interface ThreadSummary<C = Content> {
  root: Msg<C>;
  replyCount: number;
}

export interface ThreadSummaryWithExtras<C = Content> {
  root: MsgAndExtras<C>;
  replyCount: number;
  timestamp: number;
}

export interface ThreadAndExtras<C = Content> {
  messages: Array<MsgAndExtras<C>>;
  full: boolean;
  errorReason?: 'blocked' | 'missing' | 'unknown';
}

export interface PrivateThreadAndExtras<C = Content>
  extends ThreadAndExtras<C> {
  recps: Array<{
    id: string;
    name?: string;
    imageUrl: string | null | undefined;
  }>;
}

export type AnyThread = ThreadAndExtras | PrivateThreadAndExtras;

export interface AboutAndExtras extends Omit<About, 'following'> {
  id: FeedId;
  image?: string;
}

export interface AboutSelf {
  name?: string;
  image?: string;
  description?: string;
}

export interface SnapshotAbout {
  name?: string;
  blurhash?: string;
}

export interface SSBFriendsQueryDetails {
  response: boolean;
  private: boolean;
}

export type PeerKV = ConnQueryPeer;

export interface StagedPeerMetadata {
  key: string;
  type: 'lan' | 'dht' | 'internet' | 'bt' | 'room-attendant' | 'room-endpoint';
  role?: 'client' | 'server';
  note?: string;
}

export type StagedPeerKV = [string, StagedPeerMetadata];

export type Alias = Required<Omit<AliasContent, 'type' | 'action'>>;

export interface FirewallAttempt {
  id: FeedId;
  ts: number;
}

export interface StorageStats {
  blobs: number;
  indexes: number;
  jitIndexes: number;
  log: number;
  logUsedBytes: number;
  logDeletedBytes: number;
}

export interface StorageUsedByFeed {
  feedId: FeedId;
  name?: string;
  image?: string;
  imageUrl?: string | null | undefined;
  storageUsed: number;
  youBlock: boolean;
  youFollow: boolean;
}

export interface CompactionProgress {
  percent: number;
  done: boolean;
  sizeDiff?: number;
  startOffset: number;
  compactedOffset: number;
  unshiftedOffset: number;
}

export interface ContactContentAndExtras extends ContactContent {
  about?: {
    name?: string;
    blurhash?: string;
  };
}

export interface ChannelSubscribeContent {
  type: 'channel';
  channel: string;
  subscribed: boolean;
}
