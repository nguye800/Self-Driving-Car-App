// diagnosticScreen.tsx
import React, { useMemo } from "react";
import {
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

/**
 * Props you can wire up to your data source.
 * - isBluetoothConnected: connection status
 * - risk: number in [0, 1]
 * - headingDeg: robot heading in degrees (0 = up/north)
 * - distanceMeters: distance to target/obstacle/etc.
 */
type DiagnosticScreenProps = {
  isBluetoothConnected?: boolean;
  risk?: number;          // 0..1
  headingDeg?: number;    // 0..360
  distanceMeters?: number;
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

const directionFromHeading = (deg: number) => {
  // 8-wind compass labels
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const idx = Math.round(((deg % 360) / 45)) % 8;
  return dirs[idx < 0 ? idx + 8 : idx];
};

const riskColor = (r: number) => {
  // Simple green (low) → red (high) mapping
  const t = clamp01(r);
  const rC = Math.round(255 * t);
  const gC = Math.round(200 * (1 - t)); // a bit less than full green for nicer midtones
  return `rgb(${rC},${gC},60)`;
};

const BluetoothBadge: React.FC<{ connected: boolean }> = ({ connected }) => {
  return (
    <View style={styles.btRow}>
      <View
        style={[
          styles.btDot,
          { backgroundColor: connected ? "#22c55e" : "#ef4444" },
        ]}
      />
      <Text style={styles.btText}>
        {connected ? "Connected" : "Disconnected"}
      </Text>
    </View>
  );
};

const RiskIndicator: React.FC<{ value: number }> = ({ value }) => {
  const v = clamp01(value);
  const pct = `${Math.round(v * 100)}%`;

  return (
    <View style={styles.riskContainer}>
      <View style={styles.riskHeader}>
        <Text style={styles.riskLabel}>Risk</Text>
        <Text style={[styles.riskValue, { color: riskColor(v) }]}>
          {v.toFixed(2)}
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${v * 100}%`, backgroundColor: riskColor(v) }]} />
      </View>
      <Text style={styles.riskPct}>{pct}</Text>
    </View>
  );
};

const Arrow: React.FC<{ degrees: number; label: string }> = ({ degrees, label }) => {
  // Use a big ↑ and rotate it. 0° = pointing up.
  return (
    <View style={styles.arrowWrap}>
      <Text style={styles.directionText}>{label}</Text>
      <Text
        style={[
          styles.arrowGlyph,
          { transform: [{ rotate: `${degrees}deg` }] },
        ]}
        accessible
        accessibilityLabel={`Direction ${label}`}
      >
        ↑
      </Text>
    </View>
  );
};

const DiagnosticScreen: React.FC<DiagnosticScreenProps> = ({
  isBluetoothConnected = false,
  risk = 0.25,
  headingDeg = 0,
  distanceMeters = 0.0,
}) => {
  const direction = useMemo(() => directionFromHeading(headingDeg), [headingDeg]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Risk indicator */}
        <View style={styles.centerBlock}>
          <RiskIndicator value={risk} />
        </View>

        {/* Arrow + distance */}
        <View style={styles.mainBlock}>
          <Arrow degrees={headingDeg} label={direction} />
          <Text style={styles.distanceText}>
            {distanceMeters.toFixed(2)} m
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default DiagnosticScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0b1220",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Header
  headerRow: {
    position: "relative",
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#e5e7eb",
  },
  btContainer: {
    position: "absolute",
    right: 0,
    top: 8,
  },
  btRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  btDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  btText: {
    color: "#e5e7eb",
    fontSize: 12,
    fontWeight: "600",
  },

  // Risk
  centerBlock: {
    paddingHorizontal: 8,
    marginTop: 8,
    alignItems: "center",
  },
  riskContainer: {
    width: "80%",
    maxWidth: 520,
  },
  riskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  riskLabel: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  riskValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  barTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
  },
  riskPct: {
    marginTop: 6,
    color: "#9ca3af",
    fontSize: 12,
    textAlign: "right",
  },

  // Arrow + distance
  mainBlock: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  arrowWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  directionText: {
    color: "#cbd5e1",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    letterSpacing: 1,
  },
  arrowGlyph: {
    fontSize: 120,
    color: "#e5e7eb",
    lineHeight: 120,
    textAlign: "center",
  },
  distanceText: {
    marginTop: 8,
    color: "#e5e7eb",
    fontSize: 22,
    fontWeight: "700",
  },

  platformHint: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 12,
    paddingVertical: 8,
  },
});
