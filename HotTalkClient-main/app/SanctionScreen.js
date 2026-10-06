import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, CommonActions, useRoute } from '@react-navigation/native';
export default function SanctionScreen() {
    const route = useRoute(); // useRoute를 통해 route를 가져옵니다.

    const { reason = '정보 없음', endTime = new Date().toISOString() } = route.params || {};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>제재되었습니다</Text>
      <Text style={styles.reason}>제재 사유: {reason}</Text>
      <Text style={styles.endTime}>제재 종료일: {new Date(endTime).toLocaleString()}</Text>
      <Text style={styles.notice}>자세한 사항은 개발자에게 문의하세요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  reason: {
    fontSize: 18,
    marginBottom: 10,
  },
  endTime: {
    fontSize: 18,
    marginBottom: 10,
  },
  notice: {
    fontSize: 16,
    color: '#888',
    marginTop: 20,
  },
});
