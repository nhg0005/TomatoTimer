# :tomato: Tomato Timer :alarm_clock:

A Pomodoro application used personally and built for those seeking a simple, yet functional timer for their mobile device. Built using [React-Native](https://reactnative.dev/).

## Prerequisites

- [Node.js > 12](https://nodejs.org) and npm
- [Watchman](https://facebook.github.io/watchman)
- [Xcode 12](https://developer.apple.com/xcode)
- [Cocoapods 1.10.1](https://cocoapods.org)
- [JDK > 11](https://www.oracle.com/java/technologies/javase-jdk11-downloads.html)
- [Android Studio and Android SDK](https://developer.android.com/studio)

## Base dependencies

- [react-native-async-storage](https://github.com/react-native-async-storage/async-storage) for local storage.
- [push-notification-ios](https://github.com/react-native-push-notification-ios/push-notification-ios) for local notifications.

## Features
- Pomodoro timer with configurable timer lengths
- Countdown timer that allows the user to skip the current timer on touch
- Start/Stop button
- Reset Timer button for resetting the current timer
- Reset Session button for resetting the current session
- Session count for keeping track of completed sessions
- Notifications for when a timer runs out

## Screenshots

<img src="/images/initial-screen.jpeg" alt="Initial screen" width="200"/>
<img src="/images/settings-screen-2.jpeg" alt="Settings screen" width="200"/>
<img src="/images/timer-counting-down.jpeg" alt="Timer counting down" width="200"/>
<img src="/images/skip-session-alert.jpeg" alt="Skip session alert" width="200"/>
<img src="/images/notification.jpeg" alt="Notification example" width="200"/>
<img src="/images/long-break-alert.jpeg" alt="Long break alert" width="200"/>

## License
[GNU GPLv3](https://choosealicense.com/licenses/gpl-3.0/)