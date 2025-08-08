import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function HomeScreen() {
  const [startTime, setStartTime] = useState(null);
  const [stopTime, setStopTime] = useState(null);
  const [duration, setDuration] = useState(null);
  const [now, setNow] = useState(null);
  const [containerDimensions, setContainerDimensions] = useState({
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  });
  const [textDimensions, setTextDimensions] = useState({ width: 0, height: 0 });
  const [textColor, setTextColor] = useState("black");
  const [showDurations, setShowDurations] = useState(false);
  const [storedDurations, setStoredDurations] = useState([]);

  const position = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const velocity = useRef({ x: 100, y: 100 });
  const gradientAnimation = useRef(new Animated.Value(0)).current;
  const animationFrameId = useRef();

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(gradientAnimation, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: false,
        }),
        Animated.timing(gradientAnimation, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [gradientAnimation]);

  useEffect(() => {
    let intervalId = null;
    if (startTime && !stopTime) {
      intervalId = setInterval(() => setNow(new Date()), 1000);
    }
    return () => intervalId && clearInterval(intervalId);
  }, [startTime, stopTime]);

  useEffect(() => {
    const animate = () => {
      const currentPosition = { x: position.x._value, y: position.y._value };
      const speed = 1;
      let nextX = currentPosition.x + velocity.current.x * speed;
      let nextY = currentPosition.y + velocity.current.y * speed;

      const maxX = containerDimensions.width - textDimensions.width - 40;
      const maxY = containerDimensions.height - textDimensions.height - 140;

      if (nextX > maxX) {
        velocity.current.x = -Math.abs(velocity.current.x);
        nextX = maxX;
      } else if (nextX < 20) {
        velocity.current.x = Math.abs(velocity.current.x);
        nextX = 20;
      }
      if (nextY > maxY) {
        velocity.current.y = -Math.abs(velocity.current.y);
        nextY = maxY;
      } else if (nextY < 20) {
        velocity.current.y = Math.abs(velocity.current.y);
        nextY = 20;
      }

      position.setValue({ x: nextX, y: nextY });
      animationFrameId.current = requestAnimationFrame(animate);
    };

    if (startTime && !stopTime && containerDimensions.width > 0 && textDimensions.width > 0) {
      animationFrameId.current = requestAnimationFrame(animate);
    }
    return () => animationFrameId.current && cancelAnimationFrame(animationFrameId.current);
  }, [startTime, stopTime, containerDimensions, textDimensions]);

  useEffect(() => {
    if (!startTime || stopTime || !now) return;
    const elapsedSeconds = Math.round((now.getTime() - startTime.getTime()) / 1000);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    if (minutes > 0 && minutes === seconds) {
      const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`;
      setTextColor(randomColor);
    } else {
      setTextColor("black");
    }
  }, [now, startTime, stopTime]);

  const handleStart = () => {
    const padding = 40;
    const maxStartX = containerDimensions.width - textDimensions.width - padding * 2;
    const maxStartY = containerDimensions.height - textDimensions.height - padding * 2 - 100;
    const randomX = padding + (maxStartX > 0 ? Math.random() * maxStartX : 0);
    const randomY = padding + (maxStartY > 0 ? Math.random() * maxStartY : 0);

    position.setValue({ x: randomX, y: randomY });
    velocity.current = {
      x: (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random()),
      y: (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random()),
    };

    const now = new Date();
    setStartTime(now);
    setStopTime(null);
    setDuration(null);
    setNow(now);
    setTextColor("black");
  };

  const handleStop = async () => {
    if (!startTime) {
      alert("Please press Start first.");
      return;
    }
    const now = new Date();
    setStopTime(now);
    const diffInSeconds = Math.round((now.getTime() - startTime.getTime()) / 1000);
    setDuration(diffInSeconds);

    const newEntry = {
      start: startTime.toLocaleString(),
      end: now.toLocaleString(),
      duration: diffInSeconds,
    };
    try {
      const existing = await AsyncStorage.getItem('durations');
      const parsed = existing ? JSON.parse(existing) : [];
      parsed.push(newEntry);
      await AsyncStorage.setItem('durations', JSON.stringify(parsed));
    } catch (e) {
      console.error('Failed to save duration', e);
    }
  };

  const handleViewDurations = async () => {
    try {
      const data = await AsyncStorage.getItem('durations');
      const parsed = data ? JSON.parse(data) : [];
      setStoredDurations(parsed);
      setShowDurations(true);
    } catch (e) {
      console.error('Failed to load durations', e);
    }
  };

  const formatDuration = (totalSeconds) => {
    if (totalSeconds < 0) return "0 seconds";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);
    if (seconds > 0 || (hours === 0 && minutes === 0)) {
      parts.push(`${seconds} second${seconds !== 1 ? "s" : ""}`);
    }
    return parts.join(" ");
  };

  const getElapsedTime = () => {
    if (!startTime || !now) return 0;
    return Math.round((now.getTime() - startTime.getTime()) / 1000);
  };

  const gradientColors = [
    gradientAnimation.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [
        "rgba(255, 175, 189, 1)",
        "rgba(255, 195, 160, 1)",
        "rgba(255, 255, 190, 1)",
        "rgba(168, 237, 234, 1)",
        "rgba(254, 214, 227, 1)",
      ],
    }),
    gradientAnimation.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [
        "rgba(186, 234, 245, 1)",
        "rgba(174, 214, 241, 1)",
        "rgba(193, 223, 196, 1)",
        "rgba(255, 222, 233, 1)",
        "rgba(186, 234, 245, 1)",
      ],
    }),
  ];

  return (
    <AnimatedLinearGradient colors={gradientColors} style={styles.container}>
      <View
        style={styles.fullScreenContainer}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setContainerDimensions({ width, height });
        }}>
        <TouchableOpacity
          onPress={handleViewDurations}
          style={{ position: 'absolute', top: 50, right: 20, zIndex: 1 }}>
          <Text style={{ fontWeight: 'bold' }}>View Logs</Text>
        </TouchableOpacity>

        {showDurations ? (
          <View style={{ padding: 20 }}>
            {storedDurations.map((entry, index) => (
              <Text key={index} style={{ marginBottom: 10 }}>
                #{index + 1}: {formatDuration(entry.duration)}
                {"\n"}Start: {entry.start}
                {"\n"}End: {entry.end}
              </Text>
            ))}
          </View>
        ) : !startTime ? (
          <View style={styles.centeredContent}>
            <Text style={styles.displayText}>Press Start to begin timing.</Text>
          </View>
        ) : stopTime && duration !== null ? (
          <View style={styles.centeredContent}>
            <Text style={[styles.displayText, styles.stoppedText]}>
              Duration: {formatDuration(duration)}
              {"\n"}
              <Text style={styles.detailText}>
                Start: {startTime.toLocaleString()}
                {"\n"}
                End: {stopTime.toLocaleString()}
              </Text>
            </Text>
          </View>
        ) : (
          <Animated.View
            style={[styles.bouncingTextContainer, { transform: position.getTranslateTransform() }]}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              if (textDimensions.width === 0) {
                setTextDimensions({ width, height });
              }
            }}>
            <Text style={[styles.displayText, { color: textColor }]}> {formatDuration(getElapsedTime())} </Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.customButton} onPress={handleStart}>
          <Text style={styles.buttonText}>Start</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.customButton} onPress={handleStop}>
          <Text style={styles.buttonText}>Stop</Text>
        </TouchableOpacity>
      </View>
    </AnimatedLinearGradient>
  );
}

const styles = StyleSheet.create({
  // original styles from your code
  container: {
    flex: 1,
    padding: 0, // Remove padding to allow full screen movement
  },
  fullScreenContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 100, // Leave space for buttons
    overflow: "hidden", // Ensure text doesn't render outside this area
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  displayText: {
    fontSize: 24,
    textAlign: "center",
    lineHeight: 30,
    fontWeight: "bold",
  },
  stoppedText: {
    color: "green",
  },
  detailText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "normal",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingBottom: 20,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  buttonWrapper: {
    width: "40%",
  },
  bouncingTextContainer: {
    position: "absolute",
  },
  customButton: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
});
