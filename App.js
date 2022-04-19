import React, {useState, useEffect, useRef} from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Button,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  StatusBar,
  AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotificationIOS from '@react-native-community/push-notification-ios';

export default function App() {
  /***************************
   * State hooks
   **************************/

  const [workSessionLength, setWorkSessionLength] = useState(1500);
  const [shortBreakLength, setShortBreakLength] = useState(300);
  const [longBreakLength, setLongBreakLength] = useState(1800);

  const [timer, setTimer] = useState(workSessionLength);

  const [remainingSessionCount, setRemainingSessionCount] = useState(0);
  const [totalSessionCount, setTotalSessionCount] = useState(4);

  const [isWorking, setIsWorking] = useState(true);
  const [isOnLongBreak, setIsOnLongBreak] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);
  const [timerUponEnteringBackground, setTimerUponEnteringBackground] =
    useState();
  const [timerWhenActive, setTimerWhenActive] = useState();
  const [didEnterBackgroundDate, setDidEnterBackgroundDate] = useState();

  const [permissions, setPermissions] = useState({});

  /***************************
   * Lifecycle hooks
   **************************/
  ///////////// Notification setup /////////////
  const addNotificationRequest = () => {
    if (isOnLongBreak === true) {
      PushNotificationIOS.addNotificationRequest({
        id: 'longbreakend',
        title: 'Congrats!',
        subtitle: 'Your long break is finished.',
        body: 'Time to get back at it.',
        fireDate: new Date(new Date().valueOf() + (timer + 1) * 1000),
      });
    } else if (isWorking === true) {
      PushNotificationIOS.addNotificationRequest({
        id: 'workend',
        title: 'Yay!',
        subtitle: 'Work time is over.',
        body: 'Time for a break.',
        fireDate: new Date(new Date().valueOf() + timer * 1000),
      });
    } else if (remainingSessionCount + 1 === totalSessionCount) {
      PushNotificationIOS.addNotificationRequest({
        id: 'breakend',
        title: 'Sick!',
        subtitle: 'Break time is over but...',
        body: "Now it's time for a longer break!",
        fireDate: new Date(new Date().valueOf() + timer * 1000),
      });
    } else {
      PushNotificationIOS.addNotificationRequest({
        id: 'breakend',
        title: 'Getter dun.',
        subtitle: 'Break time is over.',
        body: 'Time for some work.',
        fireDate: new Date(new Date().valueOf() + timer * 1000),
      });
    }
    console.log('Notif set');
    PushNotificationIOS.getScheduledLocalNotifications(res => console.log(res));
  };

  // Set up notification permissions
  useEffect(() => {
    // Request permissions to display notifications
    PushNotificationIOS.requestPermissions({
      alert: true,
      badge: true,
      sound: true,
      critical: true,
    }).then(
      data => {
        console.log('PushNotificationIOS.requestPermissions succeeded:', data);
      },
      data => {
        console.log('PushNotificationIOS.requestPermissions failed.', data);
      },
    );

    return () => {
      // PushNotificationIOS.removeEventListener('localNotification');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sets the user's preferences when the app launches
  useEffect(() => {
    // Set preferences on launch
    setPreferences();
  }, [setPreferences]);

  // Handles the timer when going into the background
  useEffect(() => {
    // Listener for app's current state
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // Handle entering the FOREGROUND
        console.log('App has come to the foreground!');
        let currentDate = new Date();
        let diff = null;
        if (didEnterBackgroundDate !== null) {
          console.log((currentDate - didEnterBackgroundDate) / 1000);
          diff = Math.floor((currentDate - didEnterBackgroundDate) / 1000);
          // If the difference is more than the current timer value, set the timer to 0
          console.log(diff);
        }
        // If a difference exists and the timer is currently active, subtract the value from the timer
        if (diff !== null && isTimerActive === true) {
          // If the difference is more than the current timer value, set the timer to 0
          if (timer - diff <= 0) {
            setTimer(0);
          } else {
            setTimer(timer => timer - diff);
          }
        }
      } else {
        // Handle entering the BACKGROUND
        console.log('Now the app is in the background');
        setTimerUponEnteringBackground(timer);
        console.log(timer);
        setDidEnterBackgroundDate(new Date());
      }

      appState.current = nextAppState;
      setAppStateVisible(appState.current);
    });

    return () => {
      subscription.remove();
    };
  }, [timer, didEnterBackgroundDate]);

  // Handles the timer logic
  useEffect(() => {
    let interval = null;
    // Start the timer if Start button is pressed and timer isn't 0
    if (isTimerActive && timer !== 0) {
      interval = setInterval(() => {
        decrementTimer();
      }, 1000);
    }
    // Stop the timer if Stop button is pressed
    else if (!isTimerActive && timer !== 0) {
      clearInterval(interval);
    }
    // Stop the timer once timer reaches 0
    else if (timer === 0) {
      clearInterval(interval);

      // If the session that just ended is a long break
      if (isOnLongBreak) {
        setIsOnLongBreak(false);
        setIsWorking(true);
        resetTimer(true);
        setRemainingSessionCount(0);
      }
      // If the session that just ended is a working one
      else if (isWorking) {
        setIsWorking(false);
        resetTimer(false);
      } else {
        incrementSessionCount();
        if (remainingSessionCount + 1 === totalSessionCount) {
          // Alert the user
          Alert.alert("Yay you've completed a session! Time for a long break.");
          setIsWorking(false);
          setIsOnLongBreak(true);
          setTimer(longBreakLength);
          setIsTimerActive(false);
        } else {
          setIsWorking(true);
          resetTimer(true);
        }
      }
    }

    return () => clearInterval(interval);
  }, [
    isTimerActive,
    timer,
    isWorking,
    remainingSessionCount,
    totalSessionCount,
    isOnLongBreak,
    longBreakLength,
  ]);

  /***************************
   * Functions
   **************************/
  const toggleStart = () => {
    setIsTimerActive(!isTimerActive);
  };

  const resetTimer = workSession => {
    if (!workSession) {
      setTimer(shortBreakLength);
    } else {
      setTimer(workSessionLength);
    }
    setIsTimerActive(false);
  };

  const incrementTimer = () => {
    setTimer(timer => timer + 1);
  };

  const decrementTimer = () => {
    setTimer(timer => timer - 1);
  };

  const resetSession = () => {
    setIsWorking(true);
    setTimer(workSessionLength);
  };

  const createResetTimerAlert = () => {
    setIsTimerActive(false);
    // Remove all notifications since the timer is stopped
    PushNotificationIOS.removeAllPendingNotificationRequests();
    PushNotificationIOS.getScheduledLocalNotifications(res => console.log(res));

    Alert.alert(
      'Hello!',
      "Are you sure you'd like to reset the timer for the current session?",
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Cancel'),
          style: 'cancel',
        },
        {
          text: 'Yes PLS',
          onPress: () => {
            resetTimer(isWorking);
          },
        },
      ],
    );
  };

  const createResetSessionAlert = () => {
    setIsTimerActive(false);
    // Remove all notifications since the timer is stopped
    PushNotificationIOS.removeAllPendingNotificationRequests();
    PushNotificationIOS.getScheduledLocalNotifications(res => console.log(res));

    Alert.alert(
      'Yo!',
      "Are you sure you'd like to restart the current session?",
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Cancel'),
          style: 'cancel',
        },
        {
          text: 'Ya',
          onPress: () => {
            resetSession();
          },
        },
      ],
    );
  };

  const createSkipTimerAlert = () => {
    setIsTimerActive(false);
    // Remove all notifications since the timer is stopped
    PushNotificationIOS.removeAllPendingNotificationRequests();
    PushNotificationIOS.getScheduledLocalNotifications(res => console.log(res));

    Alert.alert(
      'Good morning.',
      "Are you sure you'd like to skip the current timer?",
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Cancel'),
          style: 'cancel',
        },
        {
          text: 'Morning?',
          onPress: () => {
            setTimer(0);
          },
        },
      ],
    );
  };

  const incrementSessionCount = () => {
    setRemainingSessionCount(
      remainingSessionCount => remainingSessionCount + 1,
    );
  };

  // Async Storage Functions
  const storeData = async (key, value) => {
    try {
      const storageKey = '@' + key.toString();
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(storageKey, jsonValue);
      console.log('Storage successful');
    } catch (e) {
      // saving error
      console.error(e);
    }
  };

  const getData = async key => {
    try {
      const storageKey = '@' + key.toString();
      const jsonValue = await AsyncStorage.getItem(storageKey);
      console.log('Storage get successful');
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      // error reading value
      console.error(e);
    }
  };

  // Set preferences
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setPreferences = async () => {
    // Get work length and set the timer to it on launch
    const workLengthStorage = await getData('work_length');
    if (workLengthStorage !== null) {
      setWorkSessionLength(workLengthStorage);
      setTimer(workLengthStorage);
    }

    // Get the short break length on launch
    const shortBreakStorage = await getData('short_break');
    if (shortBreakStorage !== null) {
      setShortBreakLength(shortBreakStorage);
    }

    // Get the long break length on launch
    const longBreakStorage = await getData('long_break');
    if (longBreakStorage !== null) {
      setLongBreakLength(longBreakStorage);
    }

    // Get the session count on launch
    const sessionCountStorage = await getData('session_count');
    if (sessionCountStorage !== null) {
      setTotalSessionCount(sessionCountStorage);
    }
  };

  const settingsLengthToString = time => {
    let formatted = new Date(time * 1000).toISOString().substr(14, 5);
    return formatted;
  };

  // Handlers
  const handleOnSubmitEditingLengths = (e, key) => {
    // Handle the input. Text in mins -> Num in seconds
    let num = parseInt(e.nativeEvent.text, 10) * 60;
    console.log(num);
    // If the user left the number at 0 min, set it 60 (1 min)
    if (num === 0) {
      num = 60;
    }
    // Store in async storage
    storeData(key, num);
    // Store values in state
    if (key === 'work_length') {
      setWorkSessionLength(num);
      // Reset everything
      setTimer(num);
      setRemainingSessionCount(0);
      setIsWorking(true);
      setIsTimerActive(false);
    } else if (key === 'short_break') {
      setShortBreakLength(num);
      // Reset everything
      setTimer(workSessionLength);
      setRemainingSessionCount(0);
      setIsWorking(true);
      setIsTimerActive(false);
    } else if (key === 'long_break') {
      setLongBreakLength(num);
      // Reset everything
      setTimer(workSessionLength);
      setRemainingSessionCount(0);
      setIsWorking(true);
      setIsTimerActive(false);
    }

    // Remove all notifications
    PushNotificationIOS.removeAllPendingNotificationRequests();
    PushNotificationIOS.getScheduledLocalNotifications(res => console.log(res));
  };

  const handleOnSubmitEditingSessionCount = e => {
    // Handle the input. Text in mins -> Num in seconds
    let num = parseInt(e.nativeEvent.text, 10);
    console.log(num);
    // If the user left the number at 0 min, set it 60 (1 min)
    if (num === 0) {
      num = 1;
    }
    // Store in async storage
    storeData('session_count', num);

    // Store value in state
    setTotalSessionCount(num);

    // Reset everything
    setTimer(workSessionLength);
    setRemainingSessionCount(0);
    setIsWorking(true);
    setIsTimerActive(false);

    // Remove all notifications
    PushNotificationIOS.removeAllPendingNotificationRequests();
    PushNotificationIOS.getScheduledLocalNotifications(res => console.log(res));
  };

  /***************************
   * The app
   **************************/
  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      {/* ////////// Modal ////////// */}
      <Modal
        animationType="slide"
        presentationStyle="pageSheet"
        visible={settingsModalVisible}
        onRequestClose={() => {
          setSettingsModalVisible(false);
        }}>
        <SettingsModalView
          settingsModalVisible={settingsModalVisible}
          setSettingsModalVisible={setSettingsModalVisible}
          workSessionLength={workSessionLength}
          setWorkSessionLength={setWorkSessionLength}
          shortBreakLength={shortBreakLength}
          setShortBreakLength={setShortBreakLength}
          longBreakLength={longBreakLength}
          setLongBreakLength={setLongBreakLength}
          handleOnSubmitEditingLengths={handleOnSubmitEditingLengths}
          totalSessionCount={totalSessionCount}
          handleOnSubmitEditingSessionCount={handleOnSubmitEditingSessionCount}
        />
      </Modal>
      {/* ////////// End Modal ////////// */}
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => setSettingsModalVisible(true)}
        underlayColor="#fff">
        <Text style={styles.headerText}>Tomato Timer</Text>
      </TouchableOpacity>
      <View style={styles.timerContainer}>
        <TouchableOpacity onPress={createSkipTimerAlert}>
          <Text style={styles.timerText}>{settingsLengthToString(timer)}</Text>
        </TouchableOpacity>
        <Text style={styles.timerLabel}>
          {isWorking === true ? 'Do some work' : 'Take a break!'}
        </Text>
      </View>
      {/* Button container */}
      <View style={styles.buttonContainer}>
        <StartStopButton
          isTimerActive={isTimerActive}
          timer={timer}
          toggleStart={toggleStart}
          addNotificationRequest={addNotificationRequest}
        />
        <ResetTimerButton createResetTimerAlert={createResetTimerAlert} />
        <ResetSessionButton createResetSessionAlert={createResetSessionAlert} />
      </View>
      <Text style={styles.sessionCountText}>
        Session Count: {remainingSessionCount + '/' + totalSessionCount}{' '}
      </Text>
    </SafeAreaView>
  );
}

/***************************
 * Components
 **************************/
function StartStopButton(props) {
  return (
    <TouchableOpacity
      style={styles.startButton}
      onPress={() => {
        // Toggle the timer
        props.toggleStart();
        console.log('Is the timer active? ' + props.isTimerActive);
        // Add a notification request IF the timer is NOT yet active but is going to be after button press.
        if (props.isTimerActive === false) {
          props.addNotificationRequest();
        } else {
          // Remove all notifications IF the timer is stopped
          PushNotificationIOS.removeAllPendingNotificationRequests();
          PushNotificationIOS.getScheduledLocalNotifications(res =>
            console.log(res),
          );
        }
      }}
      underlayColor="#fff">
      <Text style={styles.startButtonText}>
        {props.isTimerActive && props.timer !== 0 ? 'Stop' : 'Start'}
      </Text>
    </TouchableOpacity>
  );
}

function ResetTimerButton(props) {
  return (
    <TouchableOpacity
      style={styles.startButton}
      onPress={() => props.createResetTimerAlert()}
      underlayColor="#fff">
      <Text style={styles.startButtonText}>Reset Timer</Text>
    </TouchableOpacity>
  );
}

function ResetSessionButton(props) {
  return (
    <TouchableOpacity
      style={styles.startButton}
      onPress={() => props.createResetSessionAlert()}
      underlayColor="#fff">
      <Text style={styles.startButtonText}>Reset Session</Text>
    </TouchableOpacity>
  );
}

function SettingsModalView({
  setSettingsModalVisible,
  settingsModalVisible,
  workSessionLength,
  setWorkSessionLength,
  shortBreakLength,
  setShortBreakLength,
  longBreakLength,
  setLongBreakLength,
  handleOnSubmitEditingLengths,
  totalSessionCount,
  handleOnSubmitEditingSessionCount,
}) {
  return (
    <View style={styles.centeredView}>
      <View style={styles.modalView}>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setSettingsModalVisible(false)}
          underlayColor="#fff">
          <Text style={styles.modalHeaderText}>Settings</Text>
        </TouchableOpacity>
        {/* Change work length button */}
        <View style={styles.modalButton}>
          <Text style={styles.modalButtonText}>Work length (mins)</Text>
          <TextInput
            style={styles.modalButtonNumber}
            placeholder={(workSessionLength / 60).toString()}
            placeholderTextColor="white"
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={e => {
              handleOnSubmitEditingLengths(e, 'work_length');
            }}
          />
        </View>
        {/* Change short break length button */}
        <View style={styles.modalButton}>
          <Text style={styles.modalButtonText}>Short break length (mins)</Text>
          <TextInput
            style={styles.modalButtonNumber}
            placeholder={(shortBreakLength / 60).toString()}
            placeholderTextColor="white"
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={e => {
              handleOnSubmitEditingLengths(e, 'short_break');
            }}
          />
        </View>
        {/* Change long break length button */}
        <View style={styles.modalButton}>
          <Text style={styles.modalButtonText}>Long break length (mins)</Text>
          <TextInput
            style={styles.modalButtonNumber}
            placeholder={(longBreakLength / 60).toString()}
            placeholderTextColor="white"
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={e => {
              handleOnSubmitEditingLengths(e, 'long_break');
            }}
          />
        </View>
        {/* Change session count button */}
        <View style={styles.modalButton}>
          <Text style={styles.modalButtonText}>Session count</Text>
          <TextInput
            style={styles.modalButtonNumber}
            placeholder={totalSessionCount.toString()}
            placeholderTextColor="white"
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={handleOnSubmitEditingSessionCount}
          />
        </View>
      </View>
    </View>
  );
}

/***************************
 * Styles
 **************************/
const styles = StyleSheet.create({
  ////////////// Containers //////////////
  mainContainer: {
    flex: 1,
    backgroundColor: '#E56576',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timerContainer: {
    alignItems: 'center',
  },
  buttonContainer: {
    // flex: 1,
    // alignItems: 'center',
    justifyContent: 'center',
  },
  ////////////// Buttons //////////////
  startButton: {
    marginRight: 40,
    marginLeft: 40,
    marginTop: 10,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: 'rgba(30, 103, 56, 0.75)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E6738',
  },
  modalButton: {
    // marginRight: 40,
    // marginLeft: 40,
    marginTop: 10,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#E56576',
    borderRadius: 15,
    borderWidth: 4,
    borderColor: 'rgba(255, 253, 245, 0.3)',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ////////////// Text //////////////
  headerText: {
    fontSize: 35,
    fontWeight: 'bold',
    color: 'rgb(255, 253, 245)',
    paddingTop: 10,
  },
  timerText: {
    fontSize: 70,
    color: 'rgb(255, 253, 245)',
  },
  timerLabel: {
    fontSize: 23,
    color: 'rgb(255, 253, 245)',
    paddingTop: 10,
  },
  startButtonText: {
    color: '#fff',
    textAlign: 'center',
    paddingLeft: 40,
    paddingRight: 40,
    fontSize: 24,
  },
  sessionCountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'rgb(255, 253, 245)',
    marginTop: -20,
    paddingBottom: 40,
  },
  modalHeaderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'rgb(255, 253, 245)',
    textAlign: 'center',
    paddingBottom: 20,
  },
  modalButtonText: {
    color: 'rgba(255, 253, 245, 0.95)',
    // textAlign: 'center',
    paddingLeft: 20,
    // paddingRight: 40,
    fontSize: 18,
    fontWeight: '600',
  },
  modalButtonNumber: {
    color: 'rgba(255, 253, 245, 0.95)',
    // textAlign: 'center',
    paddingRight: 20,
    // paddingRight: 40,
    fontSize: 18,
    fontWeight: '600',
  },
  ////////////// Modal styling //////////////
  centeredView: {
    flex: 1,
    backgroundColor: '#E56576',
  },
  modalView: {
    padding: 25,
  },
  button: {
    borderRadius: 10,
    padding: 10,
    elevation: 2,
  },
  buttonOpen: {
    backgroundColor: '#F194FF',
  },
  buttonClose: {
    backgroundColor: '#2196F3',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
  },
});
