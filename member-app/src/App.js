import React from 'react';
import { StatusBar, SafeAreaView, StyleSheet } from 'react-native';
import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';

function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Root Navigator will be added here */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});

export default App;
