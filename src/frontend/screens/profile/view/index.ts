/* Copyright (C) 2018-2021 The Manyverse Authors.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {Stream} from 'xstream';
import dropRepeatsByKeys from 'xstream-drop-repeats-by-keys';
import {h} from '@cycle/react';
import {
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {FloatingAction} from 'react-native-floating-action';
import {getStatusBarHeight} from 'react-native-status-bar-height';
import {isRootPostMsg, isPublic} from 'ssb-typescript/utils';
import {SSBSource} from '../../../drivers/ssb';
import {t} from '../../../drivers/localization';
import {Palette} from '../../../global-styles/palette';
import {Dimensions} from '../../../global-styles/dimens';
import Feed from '../../../components/Feed';
import EmptySection from '../../../components/EmptySection';
import Avatar from '../../../components/Avatar';
import TopBar from '../../../components/TopBar';
import {State} from '../model';
import {
  styles,
  AVATAR_SIZE,
  AVATAR_SIZE_TOOLBAR,
  COVER_HEIGHT,
  NAME_MARGIN_TOOLBAR,
} from './styles';
import ProfileHeader from './ProfileHeader';
import ProfileID from './ProfileID';
import ProfileName from './ProfileName';
import ConnectionDot from './ConnectionDot';

function calcNameTransY(scrollY: Animated.Value): Animated.Animated {
  return scrollY.interpolate({
    inputRange: [-10, 0, COVER_HEIGHT + NAME_MARGIN_TOOLBAR],
    outputRange: [10, 0, -COVER_HEIGHT - NAME_MARGIN_TOOLBAR],
    extrapolateLeft: 'extend',
    extrapolateRight: 'clamp',
  });
}

function calcAvatarTransX(scrollY: Animated.Value): Animated.Animated {
  return scrollY.interpolate({
    inputRange: [0, COVER_HEIGHT + NAME_MARGIN_TOOLBAR],
    outputRange: [0, Dimensions.iconSizeNormal],
    extrapolate: 'clamp',
  });
}

function calcAvatarTransY(scrollY: Animated.Value): Animated.Animated {
  const margin =
    (Dimensions.toolbarHeight -
      getStatusBarHeight(true) -
      AVATAR_SIZE_TOOLBAR) *
    0.5;
  return scrollY.interpolate({
    inputRange: [-10, 0, COVER_HEIGHT + NAME_MARGIN_TOOLBAR],
    outputRange: [10, 0, -COVER_HEIGHT - AVATAR_SIZE_TOOLBAR * 0.5 - margin],
    extrapolateLeft: 'extend',
    extrapolateRight: 'clamp',
  });
}

function calcAvatarScale(scrollY: Animated.Value): Animated.Animated {
  return scrollY.interpolate({
    inputRange: [0, COVER_HEIGHT + NAME_MARGIN_TOOLBAR],
    outputRange: [1, AVATAR_SIZE_TOOLBAR / AVATAR_SIZE],
    extrapolate: 'clamp',
  });
}

function calcConnDotTransX(scrollY: Animated.Value): Animated.Animated {
  return scrollY.interpolate({
    inputRange: [0, COVER_HEIGHT + NAME_MARGIN_TOOLBAR],
    outputRange: [0, Dimensions.iconSizeNormal * 0.33],
    extrapolate: 'clamp',
  });
}

function calcConnDotTransY(scrollY: Animated.Value): Animated.Animated {
  const margin =
    (Dimensions.toolbarHeight -
      getStatusBarHeight(true) -
      AVATAR_SIZE_TOOLBAR) *
    0.5;
  return scrollY.interpolate({
    inputRange: [-10, 0, COVER_HEIGHT + NAME_MARGIN_TOOLBAR],
    outputRange: [10, 0, -COVER_HEIGHT - AVATAR_SIZE_TOOLBAR * 0.91 - margin],
    extrapolateLeft: 'extend',
    extrapolateRight: 'clamp',
  });
}

function calcConnDotScale(scrollY: Animated.Value): Animated.Animated {
  return scrollY.interpolate({
    inputRange: [0, COVER_HEIGHT + NAME_MARGIN_TOOLBAR],
    outputRange: [1, AVATAR_SIZE_TOOLBAR / AVATAR_SIZE],
    extrapolate: 'clamp',
  });
}

function ProfileTopBar({isSelfProfile}: {isSelfProfile: boolean}) {
  return h(TopBar, {sel: 'topbar', style: styles.topBar}, [
    isSelfProfile
      ? null
      : h(
          TouchableOpacity,
          {
            sel: 'manage',
            accessible: true,
            accessibilityRole: 'button',
            accessibilityLabel: t(
              'profile.call_to_action.manage.accessibility_label',
            ),
          },
          [
            h(Icon, {
              size: Dimensions.iconSizeNormal,
              color: Palette.textForBackgroundBrand,
              name: 'dots-vertical',
            }),
          ],
        ),
  ]);
}

function ProfileAvatar({
  state,
  translateX,
  translateY,
  scale,
}: {
  state: State;
  translateX: Animated.AnimatedInterpolation;
  translateY: Animated.AnimatedInterpolation;
  scale: Animated.AnimatedInterpolation;
}) {
  const animStyle = {
    transform: [{translateX}, {translateY}, {scale}],
  };

  return h(
    TouchableWithoutFeedback,
    {
      sel: 'avatar',
      accessible: true,
      accessibilityRole: 'image',
      accessibilityLabel: t('profile.picture.accessibility_label'),
    },
    [
      h(
        Animated.View,
        {style: [styles.avatarTouchable, animStyle], pointerEvents: 'box-only'},
        [
          h(Avatar, {
            size: AVATAR_SIZE,
            url: state.about.imageUrl,
            style: styles.avatar,
          }),
        ],
      ),
    ],
  );
}

export default function view(state$: Stream<State>, ssbSource: SSBSource) {
  const scrollHeaderBy = new Animated.Value(0);
  const avatarScale = calcAvatarScale(scrollHeaderBy);
  const avatarTransX = calcAvatarTransX(scrollHeaderBy);
  const avatarTransY = calcAvatarTransY(scrollHeaderBy);
  const nameTransY = calcNameTransY(scrollHeaderBy);
  const connDotTransX = calcConnDotTransX(scrollHeaderBy);
  const connDotTransY = calcConnDotTransY(scrollHeaderBy);
  const connDotScale = calcConnDotScale(scrollHeaderBy);

  return state$
    .compose(
      dropRepeatsByKeys([
        'displayFeedId',
        'selfFeedId',
        'lastSessionTimestamp',
        'about',
        'following',
        'followers',
        'connection',
        'getFeedReadable',
      ]),
    )
    .map((state) => {
      const isSelfProfile = state.displayFeedId === state.selfFeedId;
      const isBlocked = state.about.following === false;

      return h(View, {style: styles.container}, [
        h(ProfileTopBar, {isSelfProfile}),

        h(ProfileAvatar, {
          state,
          translateX: avatarTransX,
          translateY: avatarTransY,
          scale: avatarScale,
        }),

        h(ProfileName, {state, translateY: nameTransY}),

        h(ProfileID, {state, translateY: nameTransY}),

        state.connection
          ? h(ConnectionDot, {
              state,
              translateX: connDotTransX,
              translateY: connDotTransY,
              scale: connDotScale,
            })
          : null,

        ...(isBlocked
          ? [
              h(ProfileHeader, {
                about: state.about,
                following: state.following,
                followers: state.followers,
                isSelfProfile,
              }),
              h(EmptySection, {
                style: styles.emptySection,
                title: t('profile.empty.blocked.title'),
                description: t('profile.empty.blocked.description'),
              }),
              h(View, {style: styles.emptySectionSpacer}),
            ]
          : [
              h(Feed, {
                sel: 'feed',
                getReadable: state.getFeedReadable,
                prePublication$: isSelfProfile
                  ? ssbSource.publishHook$
                      .filter(isPublic)
                      .filter(isRootPostMsg)
                  : null,
                postPublication$: isSelfProfile
                  ? ssbSource.selfPublicRoots$
                  : null,
                selfFeedId: state.selfFeedId,
                lastSessionTimestamp: state.lastSessionTimestamp,
                yOffsetAnimVal: scrollHeaderBy,
                HeaderComponent: h(ProfileHeader, {
                  about: state.about,
                  following: state.following,
                  followers: state.followers,
                  isSelfProfile,
                }),
                style: styles.feed,
                EmptyComponent: isSelfProfile
                  ? h(EmptySection, {
                      style: styles.emptySection,
                      image: require('../../../../../images/noun-plant.png'),
                      title: t('profile.empty.no_self_messages.title'),
                      description: t(
                        'profile.empty.no_self_messages.description',
                      ),
                    })
                  : h(EmptySection, {
                      style: styles.emptySection,
                      title: t('profile.empty.no_messages.title'),
                      description: t('profile.empty.no_messages.description'),
                    }),
              }),
            ]),

        isSelfProfile
          ? h(FloatingAction, {
              sel: 'fab',
              color: Palette.backgroundCTA,
              visible: isSelfProfile,
              actions: [
                {
                  color: Palette.backgroundCTA,
                  name: 'compose',
                  icon: require('../../../../../images/pencil.png'),
                  text: t('profile.floating_action_button.compose'),
                },
              ],
              overrideWithAction: true,
              iconHeight: 24,
              iconWidth: 24,
            })
          : null,
      ]);
    });
}
