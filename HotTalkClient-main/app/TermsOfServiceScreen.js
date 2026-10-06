import React from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { termsTexts } from './TextConstants'; // TextConstants.js 파일에서 import

export default function TermsOfServiceScreen() {
  const navigation = useNavigation();



  return (
    <View style={styles.container}>
      <Text style={styles.title}>서비스 이용약관</Text>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.content}>
          {termsTexts.termsOfService}
        </Text>
      </ScrollView>
      <Button title="닫기" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
    width: '100%',
    marginBottom: 20,
  },
  content: {
    fontSize: 16,
    textAlign: 'left',
    padding: 10,
    lineHeight: 24, // 줄 간격을 적절하게 설정
  },
});
