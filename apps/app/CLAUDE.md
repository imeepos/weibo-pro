

这是一个expo项目，技术栈 tailwindcss + react native + zustand 状态管理


常用库：

```tsx
import { mediaDevices, RTCView } from "react-native-webrtc";
import { Canvas, type CanvasRef } from "react-native-wgpu";
import { Animated, StyleSheet, Text, View, PixelRatio } from "react-native";

export { ErrorBoundary, Stack } from "expo-router";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Video } from "expo-av";
import { useFonts } from "expo-font";
import { VictoryBar, VictoryChart } from "victory-native";
import "@expo/metro-runtime";
import * as SQLite from "expo-sqlite";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { createStore } from "tinybase";
import { createLocalPersister } from "tinybase/persisters/persister-browser";
import { createExpoSqlitePersister } from "tinybase/persisters/persister-expo-sqlite";
import {
  Provider,
  useAddRowCallback,
  useCreatePersister,
  useCreateStore,
  useDelTableCallback,
  useHasTable,
  useRow,
  useSetCellCallback,
  useSortedRowIds,
} from "tinybase/ui-react";
import { GLView } from "expo-gl";
import { Renderer, TextureLoader } from "expo-three";
import { Camera } from "expo-camera";
import { cameraWithTensors } from '@tensorflow/tfjs-react-native';
import * as tf from "@tensorflow/tfjs";
import {
  useCssElement,
  useNativeVariable as useFunctionalVariable,
} from "react-native-css";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styled from "styled-components/native";
import { handleURLCallback, StripeProvider } from "@stripe/stripe-react-native";
import type { Stripe } from "stripe";
import {
  SQLiteProvider,
  useSQLiteContext,
  type SQLiteDatabase,
} from 'expo-sqlite';
import * as SplashScreen from "expo-splash-screen";
import { Asset } from "expo-asset";
import * as Updates from "expo-updates";
import io from "socket.io-client";

```

- 状态管理

```tsx
import create from "zustand";

const initialState = {
  items: [],
};

export const useStore = create((set, get) => {
  return Object.assign(initialState, {
    items: [],
    addItem(text) {
      const items = get().items;
      set({ items: [...items, { text, id: Math.random() }] });
    },
  });
});

export function useReset() {
  useStore.setState(initialState);
}
```

```tsx
import shallow from "zustand/shallow";
import { useReset, useStore } from "./store";
const { items, addItem } = useStore(
    ({ addItem, items }) => ({
        items,
        addItem,
    }),
    shallow
);

<Button onPress={() => useReset()} title="reset" />
```