import React, { useMemo, useRef } from "react";
import { View, PanResponder, Animated, StyleSheet, LayoutChangeEvent } from "react-native";

interface Props {
  size?: number;      // track diameter
  knobSize?: number;  // knob diameter
  onMove?: (x: number, y: number) => void; // normalized -1..1
  onRelease?: () => void;
}

export default function Joystick({ size = 200, knobSize = 80, onMove, onRelease }: Props) {
  const radius = size / 2;
  const knobRadius = knobSize / 2;
  const maxTravel = radius - knobRadius;

  const pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const center = useRef({ x: 0, y: 0 });
  const hasLayout = useRef(false);

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          pos.setValue({ x: 0, y: 0 });
          onMove?.(0, 0);
        },
        onPanResponderMove: (_, gesture) => {
          const dx = clamp(gesture.dx, -maxTravel, maxTravel);
          const dy = clamp(gesture.dy, -maxTravel, maxTravel);

          pos.setValue({ x: dx, y: dy });

          // Normalize to -1..1 (invert y so up is +)
          const nx = dx / maxTravel;
          const ny = -dy / maxTravel;
          onMove?.(nx, ny);
        },
        onPanResponderRelease: () => {
          Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
          onMove?.(0, 0);
          onRelease?.();
        },
        onPanResponderTerminationRequest: () => true,
        onPanResponderTerminate: () => {
          Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
          onMove?.(0, 0);
          onRelease?.();
        },
      }),
    [maxTravel, onMove, onRelease, pos]
  );

  const onLayout = (e: LayoutChangeEvent) => {
    if (hasLayout.current) return;
    const { width, height } = e.nativeEvent.layout;
    center.current = { x: width / 2, y: height / 2 };
    hasLayout.current = true;
  };

  return (
    <View style={[styles.wrap, { width: size, height: size }]} onLayout={onLayout}>
      <View style={[styles.track, { width: size, height: size, borderRadius: radius }]} />
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.knob,
          {
            width: knobSize,
            height: knobSize,
            borderRadius: knobRadius,
            transform: [{ translateX: pos.x }, { translateY: pos.y }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    justifyContent: "center",
    alignItems: "center",
  },
  track: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
  },
  knob: {
    backgroundColor: "rgba(255,255,255,0.9)",
  },
});
